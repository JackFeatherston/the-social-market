-- ============================================================
-- The Social Market – Supabase Schema
-- Paste this into the Supabase SQL Editor and run it.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TYPES (enums)
-- ============================================================

CREATE TYPE friendship_status    AS ENUM ('pending', 'accepted');
CREATE TYPE bet_type             AS ENUM ('above-below', 'happens-or-not', 'how-many');
CREATE TYPE bet_status           AS ENUM ('pending', 'active', 'resolving', 'settled', 'cancelled');
CREATE TYPE participant_status   AS ENUM ('invited', 'accepted', 'declined', 'paid_out');
CREATE TYPE activity_type        AS ENUM ('bet_created', 'bet_joined', 'bet_won', 'bet_lost', 'friend_added');
CREATE TYPE transaction_type     AS ENUM ('deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_refund');

-- ============================================================
-- PROFILES  (one row per auth.users row)
-- ============================================================

CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username     TEXT UNIQUE NOT NULL,
  display_name TEXT,
  first_name   TEXT,
  last_name    TEXT,
  avatar_url   TEXT,
  balance      NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FRIENDSHIPS
-- ============================================================

CREATE TABLE friendships (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status        friendship_status NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id),
  CONSTRAINT unique_friendship   UNIQUE (requester_id, addressee_id)
);

-- ============================================================
-- BETS
-- ============================================================

CREATE TABLE bets (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT,
  bet_type          bet_type NOT NULL,
  -- threshold: the over/under number for 'above-below', or the target count for 'how-many'
  threshold         NUMERIC(10, 2),
  min_wager         NUMERIC(10, 2),           -- optional minimum bet; null = any amount accepted
  status            bet_status NOT NULL DEFAULT 'pending',
  winning_outcome   TEXT,         -- set during resolution ('Yes', 'No', 'Above', 'Below', a count)
  resolved_at       TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,  -- optional deadline for joining / auto-settle
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BET PARTICIPANTS
-- ============================================================

CREATE TABLE bet_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id          UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- chosen_outcome: 'Yes'/'No' | 'Above'/'Below' | a numeric string for how-many
  chosen_outcome  TEXT,
  amount          NUMERIC(10, 2) NOT NULL,
  status          participant_status NOT NULL DEFAULT 'invited',
  payout          NUMERIC(10, 2),   -- filled in after settlement
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_participant UNIQUE (bet_id, user_id)
);

-- ============================================================
-- BET RESOLUTION VOTES
-- ============================================================

CREATE TABLE bet_resolutions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id          UUID NOT NULL UNIQUE REFERENCES bets(id) ON DELETE CASCADE,
  phase           TEXT NOT NULL DEFAULT 'preliminary'
                  CHECK (phase IN ('preliminary', 'outcome', 'finalized')),
  trusted_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bet_preliminary_votes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id          UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  voter_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trusted_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_preliminary_vote UNIQUE (bet_id, voter_id)
);

CREATE TABLE bet_outcome_votes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bet_id          UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  voter_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  outcome         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_outcome_vote UNIQUE (bet_id, voter_id)
);

-- ============================================================
-- ACTIVITY FEED
-- ============================================================

CREATE TABLE activity_feed (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_user_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  bet_id          UUID REFERENCES bets(id) ON DELETE SET NULL,
  activity_type   activity_type NOT NULL,
  amount          NUMERIC(10, 2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- WALLET TRANSACTIONS  (audit trail for every balance change)
-- ============================================================

CREATE TABLE wallet_transactions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bet_id            UUID REFERENCES bets(id) ON DELETE SET NULL,
  transaction_type  transaction_type NOT NULL,
  amount            NUMERIC(10, 2) NOT NULL,  -- positive = credit, negative = debit
  balance_after     NUMERIC(10, 2) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_friendships_requester        ON friendships(requester_id);
CREATE INDEX idx_friendships_addressee        ON friendships(addressee_id);
CREATE INDEX idx_bets_creator                 ON bets(creator_id);
CREATE INDEX idx_bets_status                  ON bets(status);
CREATE INDEX idx_bet_participants_bet         ON bet_participants(bet_id);
CREATE INDEX idx_bet_participants_user        ON bet_participants(user_id);
CREATE INDEX idx_bet_resolutions_bet          ON bet_resolutions(bet_id);
CREATE INDEX idx_preliminary_votes_bet        ON bet_preliminary_votes(bet_id);
CREATE INDEX idx_outcome_votes_bet            ON bet_outcome_votes(bet_id);
CREATE INDEX idx_activity_feed_user           ON activity_feed(user_id);
CREATE INDEX idx_activity_feed_created        ON activity_feed(created_at DESC);
CREATE INDEX idx_wallet_transactions_user     ON wallet_transactions(user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_participants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_resolutions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_preliminary_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_outcome_votes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feed        ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions  ENABLE ROW LEVEL SECURITY;

-- profiles: anyone can read public profiles; users update only their own
CREATE POLICY "profiles_public_read"  ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_own_insert"   ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_own_update"   ON profiles FOR UPDATE USING (auth.uid() = id);

-- friendships: users can see and manage their own connections
CREATE POLICY "friendships_read"   ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "friendships_insert" ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "friendships_update" ON friendships FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "friendships_delete" ON friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- bets: creator can always see/edit; participants can see
CREATE POLICY "bets_insert" ON bets FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "bets_read"   ON bets FOR SELECT USING (
  auth.uid() = creator_id
  OR EXISTS (
    SELECT 1 FROM bet_participants bp
    WHERE bp.bet_id = bets.id AND bp.user_id = auth.uid()
  )
);
CREATE POLICY "bets_update_creator" ON bets FOR UPDATE USING (auth.uid() = creator_id);

-- bet_participants: visible to all participants and the creator
CREATE POLICY "bet_participants_read" ON bet_participants FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM bets b WHERE b.id = bet_participants.bet_id AND b.creator_id = auth.uid())
  OR EXISTS (SELECT 1 FROM bet_participants bp2 WHERE bp2.bet_id = bet_participants.bet_id AND bp2.user_id = auth.uid())
);
CREATE POLICY "bet_participants_insert" ON bet_participants FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM bets b WHERE b.id = bet_participants.bet_id AND b.creator_id = auth.uid())
);
CREATE POLICY "bet_participants_update_own" ON bet_participants FOR UPDATE USING (auth.uid() = user_id);

-- bet resolution: visible to the creator and all participants
CREATE POLICY "bet_resolutions_read" ON bet_resolutions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bets b
    WHERE b.id = bet_resolutions.bet_id AND b.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM bet_participants bp
    WHERE bp.bet_id = bet_resolutions.bet_id AND bp.user_id = auth.uid()
  )
);
CREATE POLICY "bet_resolutions_insert_creator" ON bet_resolutions FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM bets b
    WHERE b.id = bet_resolutions.bet_id AND b.creator_id = auth.uid()
  )
);
CREATE POLICY "bet_resolutions_update_participant" ON bet_resolutions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM bet_participants bp
    WHERE bp.bet_id = bet_resolutions.bet_id AND bp.user_id = auth.uid() AND bp.status = 'accepted'
  )
  OR EXISTS (
    SELECT 1 FROM bets b
    WHERE b.id = bet_resolutions.bet_id AND b.creator_id = auth.uid()
  )
);

-- preliminary trust votes: accepted participants vote for one accepted participant
CREATE POLICY "preliminary_votes_read" ON bet_preliminary_votes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bets b
    WHERE b.id = bet_preliminary_votes.bet_id AND b.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM bet_participants bp
    WHERE bp.bet_id = bet_preliminary_votes.bet_id AND bp.user_id = auth.uid()
  )
);
CREATE POLICY "preliminary_votes_insert_own" ON bet_preliminary_votes FOR INSERT WITH CHECK (
  auth.uid() = voter_id
  AND EXISTS (
    SELECT 1 FROM bet_participants bp
    WHERE bp.bet_id = bet_preliminary_votes.bet_id AND bp.user_id = auth.uid() AND bp.status = 'accepted'
  )
  AND EXISTS (
    SELECT 1 FROM bet_participants bp
    WHERE bp.bet_id = bet_preliminary_votes.bet_id AND bp.user_id = trusted_user_id AND bp.status = 'accepted'
  )
);
CREATE POLICY "preliminary_votes_update_own" ON bet_preliminary_votes FOR UPDATE USING (auth.uid() = voter_id)
WITH CHECK (auth.uid() = voter_id);

-- outcome votes: accepted participants vote for the outcome they believe occurred
CREATE POLICY "outcome_votes_read" ON bet_outcome_votes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bets b
    WHERE b.id = bet_outcome_votes.bet_id AND b.creator_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM bet_participants bp
    WHERE bp.bet_id = bet_outcome_votes.bet_id AND bp.user_id = auth.uid()
  )
);
CREATE POLICY "outcome_votes_insert_own" ON bet_outcome_votes FOR INSERT WITH CHECK (
  auth.uid() = voter_id
  AND EXISTS (
    SELECT 1 FROM bet_participants bp
    WHERE bp.bet_id = bet_outcome_votes.bet_id AND bp.user_id = auth.uid() AND bp.status = 'accepted'
  )
);
CREATE POLICY "outcome_votes_update_own" ON bet_outcome_votes FOR UPDATE USING (auth.uid() = voter_id)
WITH CHECK (auth.uid() = voter_id);

-- activity feed: each user sees their own entries
CREATE POLICY "activity_feed_own_read"   ON activity_feed FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "activity_feed_own_insert" ON activity_feed FOR INSERT WITH CHECK (auth.uid() = user_id);

-- wallet: each user sees only their own transactions
CREATE POLICY "wallet_own_read" ON wallet_transactions FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- 1. Auto-create a profile row when a new Supabase auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NULLIF(TRIM(
        COALESCE(NEW.raw_user_meta_data->>'first_name', '') || ' ' ||
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
      ), ''),
      NEW.raw_user_meta_data->>'username'
    ),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. Keep updated_at current
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at     BEFORE UPDATE ON profiles     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER friendships_updated_at  BEFORE UPDATE ON friendships  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bets_updated_at         BEFORE UPDATE ON bets         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER bet_resolutions_updated_at      BEFORE UPDATE ON bet_resolutions      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER preliminary_votes_updated_at    BEFORE UPDATE ON bet_preliminary_votes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER outcome_votes_updated_at        BEFORE UPDATE ON bet_outcome_votes    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 3. Deduct wager from balance when a participant accepts a bet invite
CREATE OR REPLACE FUNCTION deduct_wager_on_join()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_balance     NUMERIC(10,2);
  current_balance NUMERIC(10,2);
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') THEN
    SELECT balance INTO current_balance FROM profiles WHERE id = NEW.user_id;

    IF current_balance < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient balance: you have $% but the wager is $%.',
        current_balance, NEW.amount;
    END IF;

    UPDATE profiles
    SET balance = balance - NEW.amount
    WHERE id = NEW.user_id
    RETURNING balance INTO new_balance;

    INSERT INTO wallet_transactions (user_id, bet_id, transaction_type, amount, balance_after)
    VALUES (NEW.user_id, NEW.bet_id, 'bet_placed', -NEW.amount, new_balance);

    INSERT INTO activity_feed (user_id, bet_id, activity_type, amount)
    VALUES (NEW.user_id, NEW.bet_id, 'bet_joined', NEW.amount);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_bet_participant_accepted
  AFTER INSERT OR UPDATE ON bet_participants
  FOR EACH ROW EXECUTE FUNCTION deduct_wager_on_join();

-- 4. Settle a bet: pay out winners, log losses, update statuses
--    Call from your app or a Supabase Edge Function:
--      SELECT settle_bet('<bet_uuid>', 'Yes');
CREATE OR REPLACE FUNCTION settle_bet(
  bet_id_param        UUID,
  winning_outcome_param TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  total_pot          NUMERIC(10,2);
  winning_side_total NUMERIC(10,2);
  winner_count       INT;
  payout_each        NUMERIC(10,2);
  rec                RECORD;
  new_balance        NUMERIC(10,2);
BEGIN
  UPDATE bets
  SET status = 'settled', winning_outcome = winning_outcome_param, resolved_at = NOW()
  WHERE id = bet_id_param;

  SELECT SUM(amount) INTO total_pot
  FROM bet_participants
  WHERE bet_id = bet_id_param AND status = 'accepted';

  SELECT COUNT(*), SUM(amount)
  INTO winner_count, winning_side_total
  FROM bet_participants
  WHERE bet_id = bet_id_param
    AND status = 'accepted'
    AND chosen_outcome = winning_outcome_param;

  IF winner_count = 0 OR total_pot IS NULL THEN
    RETURN;
  END IF;

  FOR rec IN
    SELECT * FROM bet_participants
    WHERE bet_id = bet_id_param
      AND status = 'accepted'
      AND chosen_outcome = winning_outcome_param
  LOOP
    -- proportional payout: bigger wager = bigger share of the total pot
    payout_each := (rec.amount / winning_side_total) * total_pot;

    UPDATE profiles SET balance = balance + payout_each
    WHERE id = rec.user_id RETURNING balance INTO new_balance;

    UPDATE bet_participants SET status = 'paid_out', payout = payout_each WHERE id = rec.id;

    INSERT INTO wallet_transactions (user_id, bet_id, transaction_type, amount, balance_after)
    VALUES (rec.user_id, bet_id_param, 'bet_won', payout_each, new_balance);

    INSERT INTO activity_feed (user_id, bet_id, activity_type, amount)
    VALUES (rec.user_id, bet_id_param, 'bet_won', payout_each);
  END LOOP;

  FOR rec IN
    SELECT * FROM bet_participants
    WHERE bet_id = bet_id_param
      AND status = 'accepted'
      AND chosen_outcome != winning_outcome_param
  LOOP
    INSERT INTO activity_feed (user_id, bet_id, activity_type, amount)
    VALUES (rec.user_id, bet_id_param, 'bet_lost', rec.amount);
  END LOOP;
END;
$$;

-- 5. Finalize a resolution vote: recompute the trusted voter and winning
--    outcome, then call settle_bet. The trusted voter's outcome vote counts 2x.
CREATE OR REPLACE FUNCTION finalize_bet_resolution(
  bet_id_param UUID,
  winning_outcome_param TEXT
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accepted_count       INT;
  preliminary_count    INT;
  outcome_count        INT;
  trusted_user         UUID;
  computed_outcome     TEXT;
  tied_outcome_count   INT;
  max_weight           INT;
  rec                  RECORD;
  new_balance          NUMERIC(10,2);
BEGIN
  SELECT COUNT(*) INTO accepted_count
  FROM bet_participants
  WHERE bet_id = bet_id_param AND status = 'accepted';

  IF accepted_count = 0 THEN
    RAISE EXCEPTION 'Cannot settle a bet with no accepted participants.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM bet_participants
    WHERE bet_id = bet_id_param AND user_id = auth.uid() AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Only accepted participants can finalize this settlement vote.';
  END IF;

  SELECT COUNT(*) INTO preliminary_count
  FROM bet_preliminary_votes
  WHERE bet_id = bet_id_param;

  IF accepted_count >= 3 AND preliminary_count < accepted_count THEN
    RAISE EXCEPTION 'The preliminary trust vote is not complete.';
  END IF;

  IF accepted_count >= 3 THEN
    SELECT trusted_user_id INTO trusted_user
    FROM bet_preliminary_votes
    WHERE bet_id = bet_id_param
    GROUP BY trusted_user_id
    ORDER BY COUNT(*) DESC, trusted_user_id ASC
    LIMIT 1;
  END IF;

  SELECT COUNT(*) INTO outcome_count
  FROM bet_outcome_votes
  WHERE bet_id = bet_id_param;

  IF outcome_count < accepted_count THEN
    RAISE EXCEPTION 'The outcome vote is not complete.';
  END IF;

  WITH tallies AS (
    SELECT
      outcome,
      SUM(CASE WHEN voter_id = trusted_user THEN 2 ELSE 1 END) AS weighted_votes
    FROM bet_outcome_votes
    WHERE bet_id = bet_id_param
    GROUP BY outcome
  ),
  top_tallies AS (
    SELECT *
    FROM tallies
    WHERE weighted_votes = (SELECT MAX(weighted_votes) FROM tallies)
  )
  SELECT MIN(outcome), COUNT(*), MAX(weighted_votes)
  INTO computed_outcome, tied_outcome_count, max_weight
  FROM top_tallies;

  IF computed_outcome IS NULL THEN
    RAISE EXCEPTION 'No winning outcome could be computed.';
  END IF;

  IF tied_outcome_count > 1 THEN
    UPDATE bet_resolutions
    SET phase = 'finalized', trusted_user_id = trusted_user
    WHERE bet_id = bet_id_param;

    UPDATE bets
    SET status = 'settled', winning_outcome = NULL, resolved_at = NOW()
    WHERE id = bet_id_param;

    FOR rec IN
      SELECT *
      FROM bet_participants
      WHERE bet_id = bet_id_param AND status = 'accepted'
    LOOP
      UPDATE profiles
      SET balance = balance + rec.amount
      WHERE id = rec.user_id
      RETURNING balance INTO new_balance;

      UPDATE bet_participants
      SET status = 'paid_out', payout = rec.amount
      WHERE id = rec.id;

      INSERT INTO wallet_transactions (user_id, bet_id, transaction_type, amount, balance_after)
      VALUES (rec.user_id, bet_id_param, 'bet_refund', rec.amount, new_balance);
    END LOOP;

    RETURN;
  END IF;

  IF computed_outcome != winning_outcome_param THEN
    RAISE EXCEPTION 'Submitted outcome does not match the weighted vote result.';
  END IF;

  UPDATE bet_resolutions
  SET phase = 'finalized', trusted_user_id = trusted_user
  WHERE bet_id = bet_id_param;

  PERFORM settle_bet(bet_id_param, computed_outcome);
END;
$$;

-- ============================================================
-- CONVENIENCE VIEWS  (auth.uid()-aware, safe to expose)
-- ============================================================

-- Accepted friends list with profile details for the current user
CREATE VIEW friends_with_profiles AS
SELECT
  f.id            AS friendship_id,
  f.status,
  f.created_at    AS friends_since,
  CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END AS friend_id,
  p.username,
  p.display_name,
  p.avatar_url
FROM friendships f
JOIN profiles p
  ON p.id = CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END
WHERE (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  AND f.status = 'accepted';

-- Bets summary with creator info, participant count, and live pot
CREATE VIEW bets_summary
  WITH (security_invoker = on)
AS
SELECT
  b.*,
  p.username       AS creator_username,
  p.display_name   AS creator_display_name,
  p.avatar_url     AS creator_avatar_url,
  COUNT(DISTINCT bp.user_id)                                       AS participant_count,
  COALESCE(SUM(bp.amount) FILTER (WHERE bp.status = 'accepted'), 0) AS total_pot
FROM bets b
JOIN profiles p ON p.id = b.creator_id
LEFT JOIN bet_participants bp ON bp.bet_id = b.id
GROUP BY b.id, p.username, p.display_name, p.avatar_url;

-- ============================================================
-- Location settlement
-- ============================================================

ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS settlement_method       TEXT NOT NULL DEFAULT 'group_vote',
  ADD COLUMN IF NOT EXISTS location_mode           TEXT,
  ADD COLUMN IF NOT EXISTS location_result_type    TEXT,
  ADD COLUMN IF NOT EXISTS location_name           TEXT,
  ADD COLUMN IF NOT EXISTS location_lat            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_lng            DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS check_in_radius_meters  INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS check_in_deadline       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_start          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tracking_end            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_target_user_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS final_outcome           TEXT,
  ADD COLUMN IF NOT EXISTS settled_at              TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS bet_location_checkins (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id           UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lat              DOUBLE PRECISION NOT NULL,
  lng              DOUBLE PRECISION NOT NULL,
  distance_meters  DOUBLE PRECISION,
  checked_in_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_checkins_bet  ON bet_location_checkins(bet_id);
CREATE INDEX IF NOT EXISTS idx_location_checkins_user ON bet_location_checkins(user_id);

ALTER TABLE bet_location_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checkins_read" ON bet_location_checkins FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bet_participants bp
    WHERE bp.bet_id = bet_location_checkins.bet_id
      AND bp.user_id = auth.uid() AND bp.status = 'accepted'
  ) OR EXISTS (
    SELECT 1 FROM bets b
    WHERE b.id = bet_location_checkins.bet_id AND b.creator_id = auth.uid()
  )
);

CREATE POLICY "checkins_insert_own" ON bet_location_checkins FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM bet_participants bp
    WHERE bp.bet_id = bet_location_checkins.bet_id
      AND bp.user_id = auth.uid() AND bp.status = 'accepted'
  )
);

-- Recreate view so Postgres picks up the new b.* columns
DROP VIEW bets_summary;
CREATE VIEW bets_summary
  WITH (security_invoker = on)
AS
SELECT
  b.*,
  p.username       AS creator_username,
  p.display_name   AS creator_display_name,
  p.avatar_url     AS creator_avatar_url,
  COUNT(DISTINCT bp.user_id)                                        AS participant_count,
  COALESCE(SUM(bp.amount) FILTER (WHERE bp.status = 'accepted'), 0) AS total_pot
FROM bets b
JOIN profiles p ON p.id = b.creator_id
LEFT JOIN bet_participants bp ON bp.bet_id = b.id
GROUP BY b.id, p.username, p.display_name, p.avatar_url;
