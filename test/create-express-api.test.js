import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { scaffold } from "../src/scaffold.js";

function createFixture(version = "1.0.1") {
    const fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "express-template-"));
    const packageJsonPath = path.join(fixtureDirectory, "package.json");
    fs.writeFileSync(packageJsonPath, JSON.stringify({ name: "@thantpyaeshine/express-api", version }));
    fs.writeFileSync(path.join(fixtureDirectory, "app.js"), "export default 'template';\n");
    return { fixtureDirectory, packageJsonPath };
}

test("copies the matching npm template into an empty directory", async (testContext) => {
    const fixture = createFixture();
    const targetDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "express-api-"));
    testContext.after(() => {
        fs.rmSync(fixture.fixtureDirectory, { recursive: true, force: true });
        fs.rmSync(targetDirectory, { recursive: true, force: true });
    });

    const result = await scaffold(targetDirectory, {
        resolvePackage: () => fixture.packageJsonPath,
        installDependencies: false
    });

    assert.equal(result.templateVersion, "1.0.1");
    assert.equal(fs.readFileSync(path.join(targetDirectory, "app.js"), "utf8"), "export default 'template';\n");
});

test("installs generated project dependencies by default", async (testContext) => {
    const fixture = createFixture();
    const targetDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "express-api-"));
    let installedDirectory;
    testContext.after(() => {
        fs.rmSync(fixture.fixtureDirectory, { recursive: true, force: true });
        fs.rmSync(targetDirectory, { recursive: true, force: true });
    });

    await scaffold(targetDirectory, {
        resolvePackage: () => fixture.packageJsonPath,
        install: async (directory) => {
            installedDirectory = directory;
        }
    });

    assert.equal(installedDirectory, targetDirectory);
});

test("explains how to recover from a missing template dependency", async (testContext) => {
    const targetDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "express-api-"));
    testContext.after(() => fs.rmSync(targetDirectory, { recursive: true, force: true }));

    await assert.rejects(
        scaffold(targetDirectory, {
            resolvePackage: () => { throw new Error("MODULE_NOT_FOUND"); },
            installDependencies: false
        }),
        /This CLI installation is incomplete/
    );
});

test("refuses a mismatched template version", async (testContext) => {
    const fixture = createFixture("0.9.0");
    const targetDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "express-api-"));
    testContext.after(() => {
        fs.rmSync(fixture.fixtureDirectory, { recursive: true, force: true });
        fs.rmSync(targetDirectory, { recursive: true, force: true });
    });

    await assert.rejects(
        scaffold(targetDirectory, { resolvePackage: () => fixture.packageJsonPath, installDependencies: false }),
        /Template version is older than the CLI version\./
    );
    assert.deepEqual(fs.readdirSync(targetDirectory), []);
});

test("refuses to modify a non-empty target directory", async (testContext) => {
    const targetDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "express-api-"));
    fs.writeFileSync(path.join(targetDirectory, "existing.txt"), "keep me\n");
    testContext.after(() => fs.rmSync(targetDirectory, { recursive: true, force: true }));

    await assert.rejects(scaffold(targetDirectory), /Target directory is not empty/);
    assert.equal(fs.readFileSync(path.join(targetDirectory, "existing.txt"), "utf8"), "keep me\n");
});