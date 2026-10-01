/**
 * Telegram Verification Bot Worker for DevClass MCA
 * Run with: node telegram_bot.cjs
 * Handles 1-tap cryptographic phone number sharing and updates Supabase.
 */

const fs = require('fs');
const path = require('path');

// Read .env file manually
const envPath = path.join(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
      }
    }
  });
}

const BOT_TOKEN = env.VITE_TELEGRAM_BOT_TOKEN;
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_ANON_KEY;
const ADMIN_CHAT_ID = (env.VITE_TELEGRAM_ADMIN_CHAT_ID || '').trim();

if (!BOT_TOKEN) {
  console.error('❌ Error: VITE_TELEGRAM_BOT_TOKEN not found in .env');
  process.exit(1);
}

console.log('🤖 Telegram Verification Bot initializing for DevClass MCA...');
console.log(`📡 Linked to Supabase: ${SUPABASE_URL}`);
console.log(`🛡 Admin Chat Authorization: ${ADMIN_CHAT_ID ? `Enforced (Chat ID: ${ADMIN_CHAT_ID})` : '⚠ NOT SET'}`);

// Store user session state for active `/start CODE` tracking
const sessionMap = new Map();

async function callTelegram(method, payload = {}) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!json.ok) {
      console.warn(`⚠ Telegram API response (${method}):`, json.description || json);
    }
    return json;
  } catch (err) {
    console.error(`❌ Telegram network error (${method}):`, err.message);
    return null;
  }
}

async function updateSupabaseVerification(code, phoneNumber, pin, from) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log(`[Local Mode] Verified ${code} -> ${phoneNumber} (PIN: ${pin})`);
    return;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/phone_verifications`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        code: code,
        phone_number: phoneNumber,
        telegram_user_id: from.id,
        telegram_username: from.username || null,
        pin: pin,
        verified: true,
      }),
    });

    if (res.ok) {
      console.log(`✅ Supabase updated: Code [${code}] -> Phone [${phoneNumber}]`);
    } else {
      const text = await res.text();
      console.warn('⚠ Supabase update warning:', text);
    }
  } catch (err) {
    console.error('❌ Supabase write error:', err.message);
  }
}

async function setStudentApproval(username, status, phoneNumber = null) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log(`[Local Mode] Set approval for @${username} -> ${status}`);
    return true;
  }

  const clean = username ? username.replace(/^@/, '').trim() : '';
  const filterParts = [];
  if (clean) {
    filterParts.push(`username.ilike.${encodeURIComponent(clean)}`);
    filterParts.push(`username.ilike.@${encodeURIComponent(clean)}`);
  }
  if (phoneNumber) {
    filterParts.push(`phone_number.eq.${encodeURIComponent(phoneNumber.trim())}`);
  }

  const query = filterParts.length > 0 ? `?or=(${filterParts.join(',')})` : '';

  try {
    // 1. Try secure RPC function (bypasses RLS safely via SECURITY DEFINER)
    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_student_approval`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_username: clean,
        p_status: status,
        p_phone: phoneNumber ? phoneNumber.trim() : null,
      }),
    });

    if (rpcRes.ok) {
      const data = await rpcRes.json();
      console.log(`✅ Supabase RPC updated: @${clean} -> ${status} (matched: ${data?.matched_rows ?? 'ok'})`);
      return true;
    }

    // 2. Fallback to direct REST PATCH if RPC is not yet created in Supabase SQL editor
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users${query}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ face_scan_status: status }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      console.log(`✅ Supabase updated (${data ? data.length : 0} student row(s) matched): @${clean} (${phoneNumber || 'N/A'}) -> ${status}`);
      return data && data.length > 0;
    } else {
      console.warn('⚠ Supabase update error:', await res.text());
      return false;
    }
  } catch (err) {
    console.error('❌ Supabase patch error:', err.message);
    return false;
  }
}

let offset = 0;

async function pollUpdates() {
  // Clear any existing webhook to ensure getUpdates receives all incoming messages
  try {
    const delRes = await callTelegram('deleteWebhook', { drop_pending_updates: false });
    if (delRes && delRes.ok) {
      console.log('🔗 Active webhooks cleared. Long polling mode is now ACTIVE.');
    }
  } catch (err) {
    console.warn('Webhook cleanup check:', err.message);
  }

  console.log('⚡ Listening for /start commands, 1-tap contact shares & admin approvals...');

  while (true) {
    try {
      const data = await callTelegram('getUpdates', {
        offset: offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query'],
      });

      if (!data) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      if (!data.ok) {
        console.error('⚠ Telegram getUpdates error:', data.description);
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      if (data.result && data.result.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;

          // 0. Handle Admin Inline Approval / Rejection Callbacks
          if (update.callback_query) {
            const cb = update.callback_query;
            const dataStr = cb.data || '';
            const adminName = cb.from.first_name || cb.from.username || 'Admin';

            console.log(`🔘 Button clicked in Telegram: [${dataStr}] by ${adminName} (ID: ${cb.from.id})`);

            if (dataStr.startsWith('approve:') || dataStr.startsWith('reject:')) {
              // Security check: Only verified admin can trigger approval/rejection
              const isAuthorizedAdmin = !ADMIN_CHAT_ID || (
                String(cb.from.id) === ADMIN_CHAT_ID ||
                String(cb.message?.chat?.id) === ADMIN_CHAT_ID
              );

              if (!isAuthorizedAdmin) {
                console.warn(`🚨 Security: Unauthorized approval button click by ${adminName} (ID: ${cb.from.id})`);
                await callTelegram('answerCallbackQuery', {
                  callback_query_id: cb.id,
                  text: '⛔ Access Denied: Only DevClass MCA administrators can approve students.',
                  show_alert: true,
                });
                continue;
              }

              const isApprove = dataStr.startsWith('approve:');
              const action = isApprove ? 'verified' : 'rejected';
              const actionLabel = isApprove ? 'APPROVED' : 'REJECTED';
              
              const parts = dataStr.split(':');
              const cleanUser = parts[1] ? parts[1].replace(/^@/, '').trim() : '';
              const phone = parts[2] ? parts[2].trim() : null;

              console.log(`⚡ Admin ${adminName} clicked ${actionLabel} for student @${cleanUser} (${phone || 'N/A'})`);
              const updated = await setStudentApproval(cleanUser, action, phone);

              // 1. Alert the admin with a native Telegram pop-up dialog
              await callTelegram('answerCallbackQuery', {
                callback_query_id: cb.id,
                text: isApprove
                  ? `✅ Student @${cleanUser} is APPROVED!\nDevClass MCA access unlocked.`
                  : `❌ Student @${cleanUser} is REJECTED.`,
                show_alert: true,
              });

              // 2. Update the inline keyboard to a confirmed badge so it can't be clicked repeatedly
              if (cb.message) {
                const chatId = cb.message.chat.id;
                const messageId = cb.message.message_id;

                await callTelegram('editMessageReplyMarkup', {
                  chat_id: chatId,
                  message_id: messageId,
                  reply_markup: {
                    inline_keyboard: [
                      [
                        {
                          text: isApprove ? '✅ APPROVED BY ADMIN' : '❌ REJECTED BY ADMIN',
                          callback_data: 'noop',
                        },
                      ],
                    ],
                  },
                });

                // Send a clear chat confirmation message
                await callTelegram('sendMessage', {
                  chat_id: chatId,
                  text: isApprove
                    ? `🎉 *ADMIN APPROVAL CONFIRMED*\n\nStudent: *@${cleanUser}*\nStatus: *Active Verified Member*\nDecision by: *${adminName}*\n\nAccount is now active in DevClass MCA with voting and seat reservation permissions.`
                    : `❌ *ADMIN REJECTION CONFIRMED*\n\nStudent: *@${cleanUser}*\nStatus: *Access Restricted*\nDecision by: *${adminName}*`,
                  parse_mode: 'Markdown',
                });
              }
            } else if (dataStr === 'noop') {
              await callTelegram('answerCallbackQuery', {
                callback_query_id: cb.id,
                text: 'ℹ This student verification has already been processed.',
                show_alert: false,
              });
            }
            continue;
          }

          const msg = update.message;
          if (!msg) continue;

          const chatId = msg.chat.id;
          const text = msg.text || '';
          const senderName = msg.from.first_name || 'Student';

          console.log(`📥 Received from ${senderName} (Chat: ${chatId}): "${text || '[Media/Contact]'}"`);

          const isSenderAdmin = !ADMIN_CHAT_ID || (
            String(chatId) === ADMIN_CHAT_ID ||
            String(msg.from?.id) === ADMIN_CHAT_ID
          );

          if (text.startsWith('/approve') || text.startsWith('/reject') || text === '/pending') {
            if (!isSenderAdmin) {
              console.warn(`🚨 Security: Unauthorized command attempt "${text}" from ${senderName} (Chat: ${chatId}, ID: ${msg.from?.id})`);
              await callTelegram('sendMessage', {
                chat_id: chatId,
                text: '⛔ *Access Denied:* You are not authorized to execute administrator commands in DevClass MCA.',
                parse_mode: 'Markdown',
              });
              continue;
            }
          }

          // Admin command: /approve <username>
          if (text.startsWith('/approve')) {
            const parts = text.split(' ');
            const target = parts[1] ? parts[1].replace('@', '').trim() : '';
            if (!target) {
              await callTelegram('sendMessage', {
                chat_id: chatId,
                text: `⚠ Usage: \`/approve <username>\` (e.g. \`/approve celestial\`)`,
                parse_mode: 'Markdown',
              });
            } else {
              await setStudentApproval(target, 'verified');
              await callTelegram('sendMessage', {
                chat_id: chatId,
                text: `✅ *Student @${target} has been APPROVED!*\n\nAccount is now active in DevClass MCA with full voting and seat reservation permissions.`,
                parse_mode: 'Markdown',
              });
            }
            continue;
          }

          // Admin command: /reject <username>
          if (text.startsWith('/reject')) {
            const parts = text.split(' ');
            const target = parts[1] ? parts[1].replace('@', '').trim() : '';
            if (target) {
              await setStudentApproval(target, 'rejected');
              await callTelegram('sendMessage', {
                chat_id: chatId,
                text: `❌ *Student @${target} has been REJECTED.*`,
                parse_mode: 'Markdown',
              });
            }
            continue;
          }

          // Admin command: /pending
          if (text === '/pending') {
            try {
              const res = await fetch(`${SUPABASE_URL}/rest/v1/users?face_scan_status=eq.pending&select=username,phone_number,created_at`, {
                headers: {
                  apikey: SUPABASE_KEY,
                  Authorization: `Bearer ${SUPABASE_KEY}`,
                },
              });
              if (res.ok) {
                const rows = await res.json();
                if (!rows || rows.length === 0) {
                  await callTelegram('sendMessage', {
                    chat_id: chatId,
                    text: `🎉 *No pending students!* All registered students are approved.`,
                    parse_mode: 'Markdown',
                  });
                } else {
                  const list = rows.map((r, i) => `${i + 1}. *@${r.username}* (\`${r.phone_number}\`) ➔ \`/approve ${r.username}\``).join('\n');
                  await callTelegram('sendMessage', {
                    chat_id: chatId,
                    text: `📋 *Pending Student Approvals (${rows.length}):*\n\n${list}\n\nTap an \`/approve <username>\` command above to activate.`,
                    parse_mode: 'Markdown',
                  });
                }
              }
            } catch (err) {
              console.error('Pending query error:', err.message);
            }
            continue;
          }

          // 1. Handle `/start <CODE>` from website deep-link
          if (text.startsWith('/start')) {
            const parts = text.split(' ');
            const code = parts[1] ? parts[1].trim() : 'DEFAULT';
            sessionMap.set(chatId, code);

            console.log(`🚀 /start processed for code: [${code}]. Sending 1-tap contact button...`);

            const sendRes = await callTelegram('sendMessage', {
              chat_id: chatId,
              text:
                `🎓 *DEVCLASS MCA STUDENT VERIFICATION*\n\n` +
                `Welcome, *${senderName}*!\n\n` +
                `Tap the green button below to securely share your phone number with the DevClass MCA registration system.\n\n` +
                `This cryptographically verifies your identity without SMS delays.`,
              parse_mode: 'Markdown',
              reply_markup: {
                keyboard: [
                  [
                    {
                      text: '📱 Share My Verified Mobile Number',
                      request_contact: true,
                    },
                  ],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            });

            if (sendRes && sendRes.ok) {
              console.log(`📤 Verification button sent successfully to Chat: ${chatId}`);
            } else {
              console.error('❌ Failed to send verification message:', sendRes);
            }
          }

          // 2. Handle 1-Tap Contact Sharing
          else if (msg.contact) {
            let phone = msg.contact.phone_number;
            if (!phone.startsWith('+')) {
              phone = '+' + phone;
            }

            const code = sessionMap.get(chatId) || 'DEFAULT';
            const pin = Math.floor(1000 + Math.random() * 9000).toString();

            console.log(`📱 Contact shared: ${phone} by ${senderName}. Updating database...`);

            // Update Supabase
            await updateSupabaseVerification(code, phone, pin, msg.from);

            // Confirm to user in Telegram
            await callTelegram('sendMessage', {
              chat_id: chatId,
              text:
                `✅ *PHONE NUMBER VERIFIED!*\n\n` +
                `📱 *Your Number:* \`${phone}\`\n` +
                `🔑 *4-Digit PIN:* \`${pin}\`\n\n` +
                `Return to your browser now. Your phone number is verified and permanently locked into your student profile!`,
              parse_mode: 'Markdown',
              reply_markup: {
                remove_keyboard: true,
              },
            });

            console.log(`🎉 Student ${phone} verified with PIN: ${pin}`);
          }

          // 3. Fallback for other texts
          else {
            await callTelegram('sendMessage', {
              chat_id: chatId,
              text:
                `Please tap the button below or re-click "1-TAP VERIFY VIA TELEGRAM BOT" on the website to share your verified contact.`,
              reply_markup: {
                keyboard: [
                  [
                    {
                      text: '📱 Share My Verified Mobile Number',
                      request_contact: true,
                    },
                  ],
                ],
                resize_keyboard: true,
                one_time_keyboard: true,
              },
            });
          }
        }
      }
    } catch (err) {
      console.error('Polling loop error:', err.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

pollUpdates();
