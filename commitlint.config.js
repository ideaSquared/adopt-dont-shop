// Dependabot writes its own commit messages ("build(deps): Bump x from 1 to 2",
// with a body of long changelog links) and offers no setting to change the
// subject's case or wrap the body, so its commits can never satisfy
// subject-case or body-max-line-length. Skip only commits that are both shaped
// like a Dependabot bump and signed off by the Dependabot bot; everything else,
// including human commits on a Dependabot branch, is still linted.
const DEPENDABOT_SUBJECT =
  /^(build|chore)\(deps(-dev)?\): Bump (\S+ from \S+ to \S+|the \S+ group)/;
const DEPENDABOT_SIGN_OFF = /^Signed-off-by: dependabot\[bot\] <support@github\.com>$/m;

const isDependabotCommit = message =>
  DEPENDABOT_SUBJECT.test(message) && DEPENDABOT_SIGN_OFF.test(message);

export default {
  extends: ['@commitlint/config-conventional'],
  ignores: [isDependabotCommit],
};
