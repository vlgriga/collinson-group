import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'src/graphql/schema.graphql',
  generates: {
    'src/graphql/generated/resolvers.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        useTypeImports: true,
        enumsAsTypes: true,
        // A scalar left unmapped would be typed `any`.
        strictScalars: true,
        scalars: { Date: 'string' },
      },
    },
  },
};

export default config;
