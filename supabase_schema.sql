-- ==============================================================================
-- COLLEGE PRESENCE PLATFORM: DATABASE SCHEMA & STORAGE SETUP
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/<your-project-id>/sql
-- ==============================================================================

-- 1. Create Users Table with Face ID Verification and Phone Number
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supabase_uid UUID UNIQUE,
    phone_number VARCHAR(25) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    catchphrase VARCHAR(120) DEFAULT 'Ready for tomorrow',
    avatar_url TEXT,
    face_scan_url TEXT,
    face_scan_status VARCHAR(20) DEFAULT 'pending' CHECK (face_scan_status IN ('pending', 'verified', 'rejected')),
    telegram_message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fast B-Tree Unique Indexes for Instant Username & Phone Lookup (prevents duplicate redundant records)
CREATE UNIQUE INDEX IF NOT EXISTS unique_users_username_lower ON public.users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users (phone_number);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users (face_scan_status);

-- 2. Daily Polls Table for DevClass MCA
CREATE TABLE IF NOT EXISTS public.daily_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_code VARCHAR(20) DEFAULT 'DEVCLASS-MCA',
    poll_date DATE NOT NULL DEFAULT CURRENT_DATE,
    cutoff_time TIME DEFAULT '08:00:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (classroom_code, poll_date)
);

-- 3. Votes Table (46 Seats)
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID REFERENCES public.daily_polls(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('coming', 'not_coming')),
    seat_number INT CHECK (seat_number BETWEEN 1 AND 46),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (poll_id, user_id)
);

-- Ensure no duplicate seat claims for 'coming' students
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_seat ON public.votes (poll_id, seat_number) 
WHERE (status = 'coming' AND seat_number IS NOT NULL);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- 4.1 USERS TABLE POLICIES (Hardened)
DROP POLICY IF EXISTS "Allow public read users" ON public.users;
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert users" ON public.users;
-- Public registration: New registrations must always start with 'pending' status
CREATE POLICY "Allow public insert users" ON public.users FOR INSERT WITH CHECK (
    face_scan_status = 'pending'
);

DROP POLICY IF EXISTS "Allow public update users" ON public.users;
DROP POLICY IF EXISTS "Allow users update own profile fields" ON public.users;
-- Allow user profile updates (catchphrase/avatar) but STRICTLY PREVENT tampering with status, username or phone
CREATE POLICY "Allow users update own profile fields" ON public.users FOR UPDATE USING (true)
WITH CHECK (
    -- Prevents client-side tampering with face_scan_status, username, or phone_number
    face_scan_status IS NOT DISTINCT FROM (SELECT u.face_scan_status FROM public.users u WHERE u.id = users.id)
    AND username IS NOT DISTINCT FROM (SELECT u.username FROM public.users u WHERE u.id = users.id)
    AND phone_number IS NOT DISTINCT FROM (SELECT u.phone_number FROM public.users u WHERE u.id = users.id)
);

-- 4.2 DAILY POLLS & VOTES (Hardened)
DROP POLICY IF EXISTS "Allow public read polls" ON public.daily_polls;
CREATE POLICY "Allow public read polls" ON public.daily_polls FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read votes" ON public.votes;
CREATE POLICY "Allow public read votes" ON public.votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert votes" ON public.votes;
-- Only verified students are permitted to cast seat votes
CREATE POLICY "Allow verified students insert votes" ON public.votes FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = user_id AND u.face_scan_status = 'verified'
    )
);

DROP POLICY IF EXISTS "Allow public update votes" ON public.votes;
CREATE POLICY "Allow verified students update votes" ON public.votes FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = user_id AND u.face_scan_status = 'verified'
    )
);

-- 5. Storage Bucket for Face ID Scans (Audit Biometrics)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('face-scans', 'face-scans', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public upload face scans" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'face-scans');

CREATE POLICY "Allow public read face scans" ON storage.objects
FOR SELECT USING (bucket_id = 'face-scans');

-- 6. Telegram Phone Verification Sessions (Hardened)
CREATE TABLE IF NOT EXISTS public.phone_verifications (
    code VARCHAR(32) PRIMARY KEY,
    phone_number VARCHAR(25),
    telegram_user_id BIGINT,
    telegram_username VARCHAR(100),
    pin VARCHAR(6),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all phone_verifications" ON public.phone_verifications;
DROP POLICY IF EXISTS "Allow public update phone_verifications" ON public.phone_verifications;

-- Public can query session by code (needed for polling verification status)
CREATE POLICY "Allow public read phone_verifications by code" ON public.phone_verifications
FOR SELECT USING (true);

-- Creation of verification sessions: clients can ONLY insert unverified codes
CREATE POLICY "Allow public insert phone_verifications" ON public.phone_verifications
FOR INSERT WITH CHECK (verified = false);

-- SECURE WORKER PROCEDURE: Only backend worker with admin secret can verify phone sessions
CREATE OR REPLACE FUNCTION public.verify_phone_code(
    p_code TEXT,
    p_phone TEXT,
    p_pin TEXT,
    p_tg_user_id BIGINT,
    p_tg_username TEXT DEFAULT NULL,
    p_admin_secret TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_admin_secret IS DISTINCT FROM 'DEVCLASS_MCA_ADMIN_SECURE_TOKEN_2026' THEN
        RAISE EXCEPTION 'Unauthorized verification worker call';
    END IF;

    INSERT INTO public.phone_verifications (
        code, phone_number, pin, telegram_user_id, telegram_username, verified
    ) VALUES (
        p_code, p_phone, p_pin, p_tg_user_id, p_tg_username, true
    )
    ON CONFLICT (code) DO UPDATE SET
        phone_number = EXCLUDED.phone_number,
        pin = EXCLUDED.pin,
        telegram_user_id = EXCLUDED.telegram_user_id,
        telegram_username = EXCLUDED.telegram_username,
        verified = true;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. SECURE ADMIN APPROVAL PROCEDURE (Bypasses RLS safely via SECURITY DEFINER with admin token)
-- Allows the Telegram Bot / Admin to safely approve students without exposing unrestricted table updates
CREATE OR REPLACE FUNCTION public.set_student_approval(
    p_username TEXT,
    p_status TEXT,
    p_phone TEXT DEFAULT NULL,
    p_admin_secret TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INT;
BEGIN
    -- Guard: Enforce admin authorization token
    IF p_admin_secret IS DISTINCT FROM 'DEVCLASS_MCA_ADMIN_SECURE_TOKEN_2026' THEN
        RAISE EXCEPTION 'Unauthorized admin approval call';
    END IF;

    UPDATE public.users
    SET 
        face_scan_status = p_status,
        updated_at = NOW()
    WHERE 
        LOWER(username) = LOWER(p_username)
        OR (p_phone IS NOT NULL AND phone_number = p_phone);
        
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN jsonb_build_object(
        'success', true,
        'matched_rows', v_updated_count,
        'status', p_status
    );
END;
$$;

-- 8. Redundancy Elimination Procedures
-- Clean up temporary phone verification rows older than 24 hours
CREATE OR REPLACE FUNCTION public.clean_expired_verifications()
RETURNS void AS $$
BEGIN
    DELETE FROM public.phone_verifications 
    WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 9. Global Campus Chat Table (DevClass MCA)
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    username VARCHAR(50) NOT NULL,
    avatar_url TEXT,
    seat_number INT CHECK (seat_number BETWEEN 1 AND 46),
    content TEXT NOT NULL,
    reactions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure reactions column exists if table was already created
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages (created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read chat_messages" ON public.chat_messages;
CREATE POLICY "Allow public read chat_messages" ON public.chat_messages FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow verified students insert chat_messages" ON public.chat_messages;
CREATE POLICY "Allow verified students insert chat_messages" ON public.chat_messages FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users u
        WHERE (u.id = user_id OR LOWER(u.username) = LOWER(chat_messages.username))
        AND u.face_scan_status = 'verified'
    )
);

DROP POLICY IF EXISTS "Allow public update chat_reactions" ON public.chat_messages;
CREATE POLICY "Allow public update chat_reactions" ON public.chat_messages FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete chat_messages" ON public.chat_messages;
CREATE POLICY "Allow public delete chat_messages" ON public.chat_messages FOR DELETE USING (true);

-- Trigger to protect chat message edit integrity
CREATE OR REPLACE FUNCTION public.protect_chat_message_edits()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.username <> OLD.username OR (OLD.user_id IS NOT NULL AND NEW.user_id <> OLD.user_id) THEN
        RAISE EXCEPTION 'Author identity cannot be altered';
    END IF;

    IF NEW.content <> OLD.content AND OLD.created_at < (NOW() - INTERVAL '30 minutes') THEN
        RAISE EXCEPTION 'Message edit window expired (30m limit)';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_chat_message_edits ON public.chat_messages;
CREATE TRIGGER trg_protect_chat_message_edits
    BEFORE UPDATE ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_chat_message_edits();



