import { sequelize } from "../config/database";

async function main() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(254) NOT NULL,
      username VARCHAR(50) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      password_hash VARCHAR(60) NULL,
      role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
      email_verified_at DATETIME DEFAULT NULL,
      is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
      sms_2fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      email_2fa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      totp_secret VARCHAR(64) DEFAULT NULL,
      totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_users_email (email),
      UNIQUE KEY uq_users_username (username),
      UNIQUE KEY uq_users_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS reserved_usernames (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(50) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_reserved_usernames_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS user_verifications (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      verification_type ENUM('EMAIL_VERIFY', 'SMS_2FA', 'EMAIL_2FA') NOT NULL,
      token_hash CHAR(64) DEFAULT NULL,
      code_hash CHAR(64) DEFAULT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_user_verifications_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      token_hash CHAR(64) NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME DEFAULT NULL,
      attempts_used INT UNSIGNED NOT NULL DEFAULT 0,
      attempt_window_expires_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_password_reset_requests_token_hash (token_hash),
      KEY idx_password_reset_requests_user_id (user_id),
      KEY idx_password_reset_requests_expires_at (expires_at),
      KEY idx_password_reset_requests_used_at (used_at),
      CONSTRAINT fk_password_reset_requests_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS user_recovery_codes (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      code_hash VARCHAR(255) NOT NULL,
      used_at DATETIME DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      CONSTRAINT fk_user_recovery_codes_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      jti CHAR(64) NOT NULL,
      refresh_token_hash CHAR(64) DEFAULT NULL,
      is_trusted_session BOOLEAN NOT NULL DEFAULT FALSE,
      trusted_until DATETIME DEFAULT NULL,
      trusted_device_id INT UNSIGNED DEFAULT NULL,
      user_id INT UNSIGNED NOT NULL,
      issued_at DATETIME NOT NULL,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME DEFAULT NULL,
      replaced_by CHAR(64) DEFAULT NULL,
      user_agent VARCHAR(512) DEFAULT NULL,
      ip VARCHAR(64) DEFAULT NULL,
      PRIMARY KEY (jti),
      UNIQUE KEY uq_refresh_tokens_hash (refresh_token_hash),
      KEY idx_refresh_tokens_is_trusted_session (is_trusted_session),
      KEY idx_refresh_tokens_trusted_until (trusted_until),
      KEY idx_refresh_tokens_trusted_device_id (trusted_device_id),
      KEY idx_refresh_tokens_user_id (user_id),
      KEY idx_refresh_tokens_expires_at (expires_at),
      KEY idx_refresh_tokens_replaced_by (replaced_by),
      CONSTRAINT fk_refresh_tokens_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS trusted_devices (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      device_token_hash CHAR(64) NOT NULL,
      user_agent VARCHAR(512) DEFAULT NULL,
      ip VARCHAR(64) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME DEFAULT NULL,
      expires_at DATETIME NOT NULL,
      revoked_at DATETIME DEFAULT NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uq_trusted_devices_token_hash (device_token_hash),
      KEY idx_trusted_devices_user_id (user_id),
      KEY idx_trusted_devices_expires_at (expires_at),
      KEY idx_trusted_devices_revoked_at (revoked_at),
      CONSTRAINT fk_trusted_devices_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const [trustedDeviceIdColumnRows] = await sequelize.query(
    "SHOW COLUMNS FROM refresh_tokens LIKE 'trusted_device_id';"
  );
  const trustedDeviceIdColumn = Array.isArray(trustedDeviceIdColumnRows)
    ? trustedDeviceIdColumnRows
    : [];

  if (!Array.isArray(trustedDeviceIdColumn) || trustedDeviceIdColumn.length === 0) {
    await sequelize.query(`
      ALTER TABLE refresh_tokens
      ADD COLUMN trusted_device_id INT UNSIGNED DEFAULT NULL AFTER trusted_until;
    `);

    await sequelize.query(`
      ALTER TABLE refresh_tokens
      ADD KEY idx_refresh_tokens_trusted_device_id (trusted_device_id);
    `);
  }

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS captcha_attempts (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      action VARCHAR(32) NOT NULL,
      identifier_hash CHAR(64) NOT NULL,
      ip VARCHAR(64) NOT NULL,
      failed_count INT UNSIGNED NOT NULL DEFAULT 0,
      first_failed_at DATETIME NOT NULL,
      last_failed_at DATETIME NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_captcha_attempts_action_identifier_ip (action, identifier_hash, ip),
      KEY idx_captcha_attempts_action_last_failed (action, last_failed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS user_oauth_accounts (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id INT UNSIGNED NOT NULL,
      provider ENUM('google', 'github') NOT NULL,
      provider_subject VARCHAR(255) NOT NULL,
      is_sso_only BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_user_oauth_accounts_provider_subject (provider, provider_subject),
      UNIQUE KEY uq_user_oauth_accounts_user_provider (user_id, provider),
      KEY idx_user_oauth_accounts_user_id (user_id),
      CONSTRAINT fk_user_oauth_accounts_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      actor_id INT UNSIGNED DEFAULT NULL,
      actor_role ENUM('user', 'admin', 'system') DEFAULT NULL,
      action VARCHAR(100) NOT NULL,
      result ENUM('success', 'failure', 'denied', 'error') NOT NULL DEFAULT 'success',
      object_name VARCHAR(100) DEFAULT NULL,
      object_id VARCHAR(191) DEFAULT NULL,
      original_object JSON DEFAULT NULL,
      request_data JSON DEFAULT NULL,
      ip_address VARCHAR(64) DEFAULT NULL,
      user_agent VARCHAR(512) DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_audit_logs_action_created_at (action, created_at),
      KEY idx_audit_logs_actor_id_created_at (actor_id, created_at),
      KEY idx_audit_logs_ip_address_created_at (ip_address, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await sequelize.query(`
    INSERT INTO reserved_usernames (username)
    VALUES ('admin'), ('root'), ('system'), ('support')
    ON DUPLICATE KEY UPDATE username = username;
  `);

  const [tables] = await sequelize.query("SHOW TABLES;");
  console.log("Tables:", tables);

  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
