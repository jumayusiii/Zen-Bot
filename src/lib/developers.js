const DEFAULT_DEVELOPER_USER_ID = '649645473774436353';

/** The one Discord user allowed to see the hidden Developers category. */
function developerUserId() {
  return process.env.DEVELOPER_USER_ID?.trim() || DEFAULT_DEVELOPER_USER_ID;
}

/** True only for the configured developer account. */
function isDeveloper(userId) {
  const id = String(userId ?? '').trim();
  return id.length > 0 && id === developerUserId();
}

module.exports = {
  DEFAULT_DEVELOPER_USER_ID,
  developerUserId,
  isDeveloper,
};
