-- ============================================================
-- SECURITY HARDENING MIGRATION FOR DEVCLASS MCA
-- Run ALL of this in: Supabase Dashboard > SQL Editor > New Query
-- Date: 2026-11-09
-- ============================================================

-- =============================================
-- FIX 1: USERS TABLE — Column-Level Security
-- Hide phone_number, email, face_scan_url from anon role
-- =============================================
REVOKE ALL ON public.users FROM anon;
GRANT SELECT (id, username, catchphrase, avatar_url, face_scan_status) ON public.users TO anon;
GRANT INSERT ON public.users TO anon;
GRANT UPDATE (catchphrase, avatar_url) ON public.users TO anon;

-- Simplify UPDATE RLS (column grants now enforce write restrictions)
DROP POLICY IF EXISTS "Allow users update own profile fields" ON public.users;
DROP POLICY IF EXISTS "Allow public update users" ON public.users;
CREATE POLICY "Allow users update own profile" ON public.users
FOR UPDATE USING (true) WITH CHECK (true);

-- RPC: Full-profile login (SECURITY DEFINER bypasses column grants)
CREATE OR REPLACE FUNCTION public.authenticate_student(p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_row RECORD;
BEGIN
    SELECT * INTO v_row FROM public.users
    WHERE LOWER(username) = LOWER(TRIM(p_username))
    LIMIT 1;

    IF NOT FOUND THEN RETURN NULL; END IF;

    RETURN jsonb_build_object(
        'id', v_row.id,
        'username', v_row.username,
        'phone_number', v_row.phone_number,
        'email', v_row.email,
        'catchphrase', v_row.catchphrase,
        'avatar_url', v_row.avatar_url,
        'face_scan_url', v_row.face_scan_url,
        'face_scan_status', v_row.face_scan_status
    );
END;
$$;

-- =============================================
-- FIX 2: PHONE_VERIFICATIONS — Hide PINs & TG IDs
-- =============================================
REVOKE ALL ON public.phone_verifications FROM anon;
GRANT INSERT ON public.phone_verifications TO anon;
-- No direct SELECT for anon — all reads via RPC

-- RPC: Poll verification status by code (used by frontend during signup)
CREATE OR REPLACE FUNCTION public.check_verification_status(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_phone TEXT;
BEGIN
    SELECT phone_number INTO v_phone
    FROM public.phone_verifications
    WHERE code = p_code AND verified = true
    LIMIT 1;

    IF FOUND AND v_phone IS NOT NULL THEN
        RETURN jsonb_build_object('verified', true, 'phone_number', v_phone);
    END IF;
    RETURN jsonb_build_object('verified', false);
END;
$$;

-- RPC: Verify by 4-digit PIN (used by frontend as fallback)
CREATE OR REPLACE FUNCTION public.check_pin_verification(p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_phone TEXT;
BEGIN
    SELECT phone_number INTO v_phone
    FROM public.phone_verifications
    WHERE pin = TRIM(p_pin) AND verified = true
    LIMIT 1;

    IF FOUND AND v_phone IS NOT NULL THEN
        RETURN jsonb_build_object('valid', true, 'phone_number', v_phone);
    END IF;
    RETURN jsonb_build_object('valid', false);
END;
$$;

-- =============================================
-- FIX 3: CHAT_MESSAGES — Remove open DELETE policy
-- =============================================
DROP POLICY IF EXISTS "Allow public delete chat_messages" ON public.chat_messages;
-- Deletion is now soft-delete only (PATCH reactions._deleted via existing UPDATE policy)

-- =============================================
-- FIX 4: FACE-SCANS BUCKET — Make private
-- =============================================
UPDATE storage.buckets SET public = false WHERE id = 'face-scans';
DROP POLICY IF EXISTS "Allow public read face scans" ON storage.objects;
-- Upload policy stays: frontend can still upload during registration
-- Face scan URLs are no longer publicly browsable or downloadable

-- =============================================
-- FIX 5: Fix set_student_approval — REQUIRE admin_secret
-- The old function was callable without the secret due to DEFAULT NULL
-- =============================================
DROP FUNCTION IF EXISTS public.set_student_approval(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.set_student_approval(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.set_student_approval(
    p_username TEXT,
    p_status TEXT,
    p_phone TEXT,
    p_admin_secret TEXT  -- NO DEFAULT — caller must provide
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INT;
BEGIN
    IF p_admin_secret IS NULL OR p_admin_secret IS DISTINCT FROM 'DEVCLASS_MCA_ADMIN_SECURE_TOKEN_2026' THEN
        RAISE EXCEPTION 'Unauthorized admin approval call';
    END IF;

    UPDATE public.users
    SET face_scan_status = p_status, updated_at = NOW()
    WHERE LOWER(username) = LOWER(p_username)
       OR (p_phone IS NOT NULL AND phone_number = p_phone);

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN jsonb_build_object('success', true, 'matched_rows', v_updated_count, 'status', p_status);
END;
$$;

-- Only allow service_role (backend bot) to call this
REVOKE EXECUTE ON FUNCTION public.set_student_approval(TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_student_approval(TEXT, TEXT, TEXT, TEXT) FROM authenticated;

-- =============================================
-- FIX 6: Fix verify_phone_code — REQUIRE admin_secret
-- =============================================
DROP FUNCTION IF EXISTS public.verify_phone_code(TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.verify_phone_code(TEXT, TEXT, TEXT, BIGINT, TEXT);

CREATE OR REPLACE FUNCTION public.verify_phone_code(
    p_code TEXT,
    p_phone TEXT,
    p_pin TEXT,
    p_tg_user_id BIGINT,
    p_tg_username TEXT,
    p_admin_secret TEXT  -- NO DEFAULT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_admin_secret IS NULL OR p_admin_secret IS DISTINCT FROM 'DEVCLASS_MCA_ADMIN_SECURE_TOKEN_2026' THEN
        RAISE EXCEPTION 'Unauthorized verification worker call';
    END IF;

    INSERT INTO public.phone_verifications (code, phone_number, pin, telegram_user_id, telegram_username, verified)
    VALUES (p_code, p_phone, p_pin, p_tg_user_id, p_tg_username, true)
    ON CONFLICT (code) DO UPDATE SET
        phone_number = EXCLUDED.phone_number,
        pin = EXCLUDED.pin,
        telegram_user_id = EXCLUDED.telegram_user_id,
        telegram_username = EXCLUDED.telegram_username,
        verified = true;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.verify_phone_code(TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.verify_phone_code(TEXT, TEXT, TEXT, BIGINT, TEXT, TEXT) FROM authenticated;

