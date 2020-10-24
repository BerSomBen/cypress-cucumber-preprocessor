import { generateMessages } from "@cucumber/gherkin";

import { IdGenerator } from "@cucumber/messages";

import { assertAndReturn } from "./assertions";

import { getStepDefinitionPaths } from "./step-definitions";

function notNull<T>(value: T | null | undefined): value is T {
  return value != null;
}

export async function compile(data: string, uri: string) {
  const options = {
    includeSource: false,
    includeGherkinDocument: true,
    includePickles: true,
    newId: IdGenerator.uuid(),
  };

  const envelopes = generateMessages(data, uri, options);

  if (envelopes[0].parseError) {
    throw new Error(
      assertAndReturn(
        envelopes[0].parseError.message,
        "Expected parse error to have a description"
      )
    );
  }

  const gherkinDocument = assertAndReturn(
    envelopes.map((envelope) => envelope.gherkinDocument).find(notNull),
    "Expected to find a gherkin document amongst the envelopes."
  );

  const pickles = envelopes.map((envelope) => envelope.pickle).filter(notNull);

  const stepDefinitions = await getStepDefinitionPaths(uri);

  return `
    const createTests = require("@badeball/cypress-cucumber-preprocessor/lib/create-tests");

    ${stepDefinitions
      .map((stepDefintion) => `require("${stepDefintion}");`)
      .join("\n    ")}

    createTests.default(
      ${JSON.stringify(gherkinDocument)},
      ${JSON.stringify(pickles)}
    );
  `;
}
