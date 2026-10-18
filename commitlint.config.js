// The commit grammar, see docs/git-flow.md#commits.
const TYPES = ['feat', 'fix', 'refactor', 'perf', 'revert', 'docs', 'test', 'chore', 'ci', 'build'];
const SCOPES = [
  'graphql',
  'ranking',
  'locations',
  'weather',
  'scoring',
  'jobs',
  'db',
  'shared',
  'config',
  'infra',
  'docs',
];

// `#<issue> <description>`, the issue optional, plus ` (#<pr>)` on the squash commit on main.
const SUBJECT = /^(#\d+ )?[^#]+?( \(#\d+\))?$/;

export default {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'subject-issue': ({ subject }) => [
          subject === null || SUBJECT.test(subject),
          'subject must be `#<issue> <description>`, the issue right after the colon',
        ],
      },
    },
  ],
  rules: {
    'type-enum': [2, 'always', TYPES],
    'scope-enum': [2, 'always', SCOPES],
    'scope-empty': [2, 'never'],
    'header-max-length': [2, 'always', 72],
    'subject-issue': [2, 'always'],
  },
};
