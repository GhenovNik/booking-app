-- FareTicketHunter — initial migration
-- Run via: npm run db:migrate

CREATE TYPE watch_mode AS ENUM ('fixed', 'flexible');
CREATE TYPE cabin AS ENUM ('ECONOMY', 'BUSINESS', 'FIRST');
CREATE TYPE alert_type AS ENUM ('absolute_max', 'percent_drop');

-- watches -----------------------------------------------------------------
CREATE TABLE watches (
  id                serial        PRIMARY KEY,
  name              text          NOT NULL,
  origin            char(3)       NOT NULL,
  destination       char(3)       NOT NULL,
  mode              watch_mode    NOT NULL,
  -- fixed mode
  dep_date          date,
  ret_date          date,
  -- flexible mode
  dep_from          date,
  dep_to            date,
  ret_from          date,
  ret_to            date,
  -- common
  pax               smallint      NOT NULL DEFAULT 1,
  cabin             cabin         NOT NULL DEFAULT 'ECONOMY',
  fetch_interval_h  integer       NOT NULL DEFAULT 12,
  is_active         boolean       NOT NULL DEFAULT true,
  last_checked_at   timestamptz,
  created_at        timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX watches_active_last_checked_idx
  ON watches (is_active, last_checked_at)
  WHERE is_active = true;

-- alert_rules -------------------------------------------------------------
CREATE TABLE alert_rules (
  id         serial       PRIMARY KEY,
  watch_id   integer      NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
  type       alert_type   NOT NULL,
  value      numeric(10,2) NOT NULL,
  currency   char(3)      NOT NULL DEFAULT 'EUR',
  is_active  boolean      NOT NULL DEFAULT true
);

-- price_snapshots ---------------------------------------------------------
CREATE TABLE price_snapshots (
  id             bigserial    PRIMARY KEY,
  watch_id       integer      NOT NULL REFERENCES watches(id) ON DELETE CASCADE,
  checked_at     timestamptz  NOT NULL DEFAULT now(),
  outbound_date  date         NOT NULL,
  inbound_date   date,
  price          numeric(10,2) NOT NULL,
  currency       char(3)      NOT NULL,
  is_promo       boolean      NOT NULL DEFAULT false,
  raw            jsonb        NOT NULL
);

CREATE INDEX price_snapshots_watch_date_idx
  ON price_snapshots (watch_id, outbound_date, inbound_date, checked_at DESC);

-- notifications -----------------------------------------------------------
CREATE TABLE notifications (
  id           bigserial    PRIMARY KEY,
  watch_id     integer      NOT NULL REFERENCES watches(id),
  rule_id      integer      NOT NULL REFERENCES alert_rules(id),
  snapshot_id  bigint       NOT NULL REFERENCES price_snapshots(id),
  sent_at      timestamptz  NOT NULL DEFAULT now(),
  chat_id      text         NOT NULL,
  price        numeric(10,2) NOT NULL,
  message_id   text
);

-- port_cache --------------------------------------------------------------
CREATE TABLE port_cache (
  iata_code   char(3)      PRIMARY KEY,
  name        text         NOT NULL,
  city        text,
  country     char(2),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);
