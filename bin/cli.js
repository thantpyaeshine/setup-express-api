#!/usr/bin/env node

import path from "node:path";
import { assertTargetDirectory, scaffold } from "../src/scaffold.js";
import { promptForProjectConfig } from "../src/utils/project-config.js";

const argumentsList = process.argv.slice(2);
const showHelp = argumentsList.includes("--help") || argumentsList.includes("-h");
const skipInstall = argumentsList.includes("--skip-install");
const skipPrompts = argumentsList.includes("-y") || argumentsList.includes("--yes");
const targetArguments = argumentsList.filter((argument) => !argument.startsWith("-"));

if (showHelp) {
    console.log("Usage: setup-express-api <directory> [--skip-install] [-y|--yes]");
    console.log("\nExample: npx setup-express-api ./my-api");
    process.exit(0);
}

if (targetArguments.length !== 1) {
    console.error("Specify exactly one install directory. Example: npx setup-express-api ./my-api");
    process.exit(1);
}

try {
    const targetDir = path.resolve(process.cwd(), targetArguments[0]);
    assertTargetDirectory(targetDir);

    const projectConfig = skipPrompts
        ? {
            name: path.basename(targetDir).toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "express-api-server",
            description: "",
            author: "",
            license: "MIT"
        }
        : await promptForProjectConfig(targetDir);

    const result = await scaffold(targetDir, { projectConfig, installDependencies: !skipInstall });
    console.log(`setup-express-api@${result.templateVersion}`);
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}