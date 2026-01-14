import { generate } from "openapi-typescript-codegen";

generate({
  input: "./api/kanaeru_api_swagger.yaml",
  output: "./src/api",
  httpClient: "fetch",
  useOptions: true,
});
