// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "storybook-static/**"]),
  ...storybook.configs["flat/recommended"],
  {
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.name='Button']:not(:has(JSXAttribute[name.name='nativeButton'])) JSXAttribute[name.name='render'] JSXElement[openingElement.name.name=/^(Link|a)$/]",
          message:
            "Button rendering a Link/<a> via `render` needs a sibling `nativeButton={false}` prop — Base UI's Button defaults to native <button> semantics.",
        },
      ],
    },
  },
]);

export default eslintConfig;
