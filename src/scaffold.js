import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const cliPackagePath = path.resolve(moduleDirectory, "..", "package.json");

class PackageIntegrityError extends Error {
    constructor(message) {
        super(`${message}\n\nThis is a package release issue, not caused by your environment.`);
    }
}

function readPackageJson(packageJsonPath, label) {
    try {
        return JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    } catch {
        throw new PackageIntegrityError(`Unable to read ${label} package metadata.`);
    }
}

function getTemplatePackageName(cliPackage) {
    const dependencyNames = Object.keys(cliPackage.dependencies ?? {});

    if (dependencyNames.length === 0) {
        throw new PackageIntegrityError("CLI package metadata is missing its template dependency.");
    }

    return dependencyNames[0];
}

function compareVersions(left, right) {
    const toParts = (value) =>
        String(value ?? "0")
            .split("-")[0]
            .split(".")
            .map((part) => Number.parseInt(part, 10) || 0);

    const maxLength = Math.max(toParts(left).length, toParts(right).length);
    for (let index = 0; index < maxLength; index += 1) {
        const difference = (toParts(left)[index] ?? 0) - (toParts(right)[index] ?? 0);
        if (difference !== 0) {
            return difference;
        }
    }

    return 0;
}

function resolveTemplatePackage(templatePackageName, resolvePackage) {
    try {
        return resolvePackage(`${templatePackageName}/package.json`);
    } catch {
        throw new Error(
            `Unable to resolve required template package: ${templatePackageName}.\n\nThis CLI installation is incomplete. Reinstall the package or run npm install in the project that owns this CLI.`
        );
    }
}

export function assertTargetDirectory(targetDir) {
    if (!fs.existsSync(targetDir)) {
        throw new Error(`Target directory does not exist: ${targetDir}`);
    }

    if (!fs.statSync(targetDir).isDirectory()) {
        throw new Error(`Target path is not a directory: ${targetDir}`);
    }

    if (fs.readdirSync(targetDir).length > 0) {
        throw new Error(`Target directory is not empty: ${targetDir}`);
    }
}

export async function scaffold(targetDir, options = {}) {
    assertTargetDirectory(targetDir);

    const cliPackage = readPackageJson(options.cliPackagePath || cliPackagePath, "CLI");
    const templatePackageName = getTemplatePackageName(cliPackage);
    const declaredTemplateVersion = cliPackage.dependencies?.[templatePackageName];

    if (!declaredTemplateVersion) {
        throw new PackageIntegrityError(
            `Template dependency is missing from package metadata.\n\nPackage: ${cliPackage.name}\nExpected dependency: ${templatePackageName}`
        );
    }

    const templatePackagePath = resolveTemplatePackage(templatePackageName, options.resolvePackage || require.resolve);
    const templatePackage = readPackageJson(templatePackagePath, "template");

    if (compareVersions(templatePackage.version, cliPackage.version) < 0) {
        throw new PackageIntegrityError(
            `Template version is older than the CLI version.\n\nCLI version:      ${cliPackage.version}\nTemplate version: ${templatePackage.version}\n\nUpgrade the template dependency before scaffolding a new project.`
        );
    }

    const templateDirectory = path.dirname(templatePackagePath);
    if (!fs.existsSync(templateDirectory) || !fs.statSync(templateDirectory).isDirectory()) {
        throw new PackageIntegrityError(`Template files are missing from ${templatePackageName}.`);
    }

    try {
        fs.cpSync(templateDirectory, targetDir, { recursive: true });
        if (options.projectConfig) {
            const generatedPackagePath = path.join(targetDir, "package.json");
            const generatedPackage = readPackageJson(generatedPackagePath, "generated project");
            fs.writeFileSync(
                generatedPackagePath,
                `${JSON.stringify({ ...generatedPackage, ...options.projectConfig }, null, 2)}\n`
            );
        }
    } catch {
        throw new Error(`Unable to copy template files into: ${targetDir}`);
    }

    if (options.installDependencies !== false) {
        const install = options.install || installDependencies;
        await install(targetDir);
    }

    return { targetDir, templateVersion: templatePackage.version };
}

function installDependencies(targetDir) {
    const { spawnSync } = require("node:child_process");
    const isWindows = process.platform === "win32";
    const command = isWindows ? (process.env.ComSpec || "cmd.exe") : "npm";
    const args = isWindows ? ["/d", "/s", "/c", "npm", "install"] : ["install"];

    const result = spawnSync(command, args, {
        cwd: targetDir,
        stdio: "inherit",
        shell: false,
        windowsHide: true
    });

    if (result.error) {
        throw new Error(`Unable to start npm install: ${result.error.message}`);
    }

    if (result.status !== 0) {
        throw new Error(`npm install failed with exit code ${result.status}. Run npm install in ${targetDir} after resolving the reported issue.`);
    }
}