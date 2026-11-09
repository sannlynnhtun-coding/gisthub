import { checkToolWorkspaces } from './test-tool-workspaces.mjs';

export async function checkToolsGuide(context) {
  await checkToolWorkspaces(context);
}
