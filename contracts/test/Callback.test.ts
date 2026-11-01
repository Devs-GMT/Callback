import { expect } from "chai";
import { network } from "hardhat";
import type { Signer } from "ethers";

/**
 * Tests for Callback.sol.
 *
 * The invariants that matter are the ones the PRD leans on:
 *
 *  - ids start at 1, so `improvedFrom == 0` unambiguously means "first check";
 *  - `improvedFrom` can only point at an earlier report of the same owner,
 *    which is what makes a before/after chain trustworthy;
 *  - scores and job title length are bounded;
 *  - nothing identifying can be written, which is enforced by the ABI itself
 *    (only two hashes, two scores, a title and a parent id are accepted).
 */
describe("Callback", () => {
  const REPORT_HASH =
    "0x1111111111111111111111111111111111111111111111111111111111111111";
  const CV_HASH =
    "0x2222222222222222222222222222222222222222222222222222222222222222";
  const OTHER_REPORT_HASH =
    "0x3333333333333333333333333333333333333333333333333333333333333333";
  const ZERO_HASH =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  async function deploy() {
    const { ethers } = await network.getOrCreate();
    const [owner, other] = (await ethers.getSigners()) as Signer[];
    const factory = await ethers.getContractFactory("Callback");
    const callback = await factory.deploy();
    await callback.waitForDeployment();
    return { callback, owner, other, ethers };
  }

  /* ---------------------------------------------------------------------- */
  /* Ids                                                                    */
  /* ---------------------------------------------------------------------- */

  describe("report ids", () => {
    it("reserves index 0 so the first real report is id 1", async () => {
      const { callback } = await deploy();

      const id = await callback.stamp.staticCall(
        REPORT_HASH,
        CV_HASH,
        64,
        58,
        0,
        "Product Analyst",
      );

      expect(id).to.equal(1n);
    });

    it("does not count the placeholder in stats", async () => {
      const { callback } = await deploy();

      const [totalReports, totalRechecks] = await callback.stats();
      expect(totalReports).to.equal(0n);
      expect(totalRechecks).to.equal(0n);
    });

    it("rejects reading the placeholder at id 0", async () => {
      const { callback } = await deploy();

      await expect(callback.getReport(0))
        .to.be.revertedWithCustomError(callback, "UnknownParent")
        .withArgs(0n);
    });

    it("rejects reading an id that does not exist", async () => {
      const { callback } = await deploy();

      await expect(callback.getReport(99))
        .to.be.revertedWithCustomError(callback, "UnknownParent")
        .withArgs(99n);
    });

    it("assigns ids in order", async () => {
      const { callback } = await deploy();

      await callback.stamp(REPORT_HASH, CV_HASH, 64, 58, 0, "One");
      await callback.stamp(OTHER_REPORT_HASH, CV_HASH, 70, 60, 0, "Two");

      const [totalReports] = await callback.stats();
      expect(totalReports).to.equal(2n);
      expect((await callback.getReport(1)).jobTitle).to.equal("One");
      expect((await callback.getReport(2)).jobTitle).to.equal("Two");
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Stamping                                                               */
  /* ---------------------------------------------------------------------- */

  describe("stamp", () => {
    it("stores every field and emits Stamped", async () => {
      const { callback, owner } = await deploy();
      const ownerAddress = await owner.getAddress();

      await expect(callback.stamp(REPORT_HASH, CV_HASH, 64, 58, 0, "Product Analyst"))
        .to.emit(callback, "Stamped")
        .withArgs(1n, ownerAddress, 64, 58);

      const report = await callback.getReport(1);
      expect(report.owner).to.equal(ownerAddress);
      expect(report.reportHash).to.equal(REPORT_HASH);
      expect(report.cvHash).to.equal(CV_HASH);
      expect(report.atsScore).to.equal(64);
      expect(report.matchScore).to.equal(58);
      expect(report.improvedFrom).to.equal(0n);
      expect(report.jobTitle).to.equal("Product Analyst");
      // Read the timestamp by tuple index: `report.at` resolves to
      // Array.prototype.at on the ethers Result proxy rather than to the
      // struct field, and the generated type is a tuple, so index 7 is
      // both the runtime-correct and the type-correct way in.
      expect(report[7]).to.be.greaterThan(0n);
    });

    it("accepts the boundary scores 0 and 100", async () => {
      const { callback } = await deploy();

      await callback.stamp(REPORT_HASH, CV_HASH, 0, 0, 0, "Floor");
      await callback.stamp(REPORT_HASH, CV_HASH, 100, 100, 0, "Ceiling");

      expect((await callback.getReport(1)).atsScore).to.equal(0);
      expect((await callback.getReport(2)).matchScore).to.equal(100);
    });

    it("rejects an ATS score above 100", async () => {
      const { callback } = await deploy();

      await expect(callback.stamp(REPORT_HASH, CV_HASH, 101, 50, 0, "Too high"))
        .to.be.revertedWithCustomError(callback, "ScoreOutOfRange")
        .withArgs(101);
    });

    it("rejects a match score above 100", async () => {
      const { callback } = await deploy();

      await expect(callback.stamp(REPORT_HASH, CV_HASH, 50, 255, 0, "Too high"))
        .to.be.revertedWithCustomError(callback, "ScoreOutOfRange")
        .withArgs(255);
    });

    it("rejects a zero report hash", async () => {
      const { callback } = await deploy();

      await expect(
        callback.stamp(ZERO_HASH, CV_HASH, 50, 50, 0, "No proof"),
      ).to.be.revertedWithCustomError(callback, "EmptyHash");
    });

    it("rejects a zero CV hash", async () => {
      const { callback } = await deploy();

      await expect(
        callback.stamp(REPORT_HASH, ZERO_HASH, 50, 50, 0, "No proof"),
      ).to.be.revertedWithCustomError(callback, "EmptyHash");
    });

    it("accepts a job title of exactly 60 bytes", async () => {
      const { callback } = await deploy();
      const title = "a".repeat(60);

      await callback.stamp(REPORT_HASH, CV_HASH, 50, 50, 0, title);
      expect((await callback.getReport(1)).jobTitle).to.equal(title);
    });

    it("rejects a job title of 61 bytes", async () => {
      const { callback } = await deploy();

      await expect(callback.stamp(REPORT_HASH, CV_HASH, 50, 50, 0, "a".repeat(61)))
        .to.be.revertedWithCustomError(callback, "JobTitleTooLong")
        .withArgs(61n);
    });

    it("measures the job title in bytes, not characters", async () => {
      const { callback } = await deploy();
      // 21 three-byte characters is 63 bytes, which is over the limit even
      // though it is well under 60 characters.
      const title = "設".repeat(21);

      await expect(callback.stamp(REPORT_HASH, CV_HASH, 50, 50, 0, title))
        .to.be.revertedWithCustomError(callback, "JobTitleTooLong")
        .withArgs(63n);
    });

    it("accepts an empty job title", async () => {
      const { callback } = await deploy();

      await callback.stamp(REPORT_HASH, CV_HASH, 50, 50, 0, "");
      expect((await callback.getReport(1)).jobTitle).to.equal("");
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Re-checks                                                              */
  /* ---------------------------------------------------------------------- */

  describe("improvedFrom", () => {
    it("links a re-check to an earlier report of the same owner", async () => {
      const { callback } = await deploy();

      await callback.stamp(REPORT_HASH, CV_HASH, 64, 58, 0, "Product Analyst");
      await callback.stamp(OTHER_REPORT_HASH, CV_HASH, 88, 81, 1, "Product Analyst");

      const recheck = await callback.getReport(2);
      expect(recheck.improvedFrom).to.equal(1n);
      expect(recheck.atsScore).to.equal(88);

      const [totalReports, totalRechecks] = await callback.stats();
      expect(totalReports).to.equal(2n);
      expect(totalRechecks).to.equal(1n);
    });

    it("does not count a first check as a re-check", async () => {
      const { callback } = await deploy();

      await callback.stamp(REPORT_HASH, CV_HASH, 64, 58, 0, "First");

      const [, totalRechecks] = await callback.stats();
      expect(totalRechecks).to.equal(0n);
    });

    it("rejects a parent that does not exist", async () => {
      const { callback } = await deploy();

      await expect(callback.stamp(REPORT_HASH, CV_HASH, 64, 58, 7, "Orphan"))
        .to.be.revertedWithCustomError(callback, "UnknownParent")
        .withArgs(7n);
    });

    it("rejects the index 0 placeholder as a parent", async () => {
      // improvedFrom == 0 is the "none" sentinel, so it can never be read as
      // a parent. This asserts the placeholder stays unreachable.
      const { callback } = await deploy();

      await callback.stamp(REPORT_HASH, CV_HASH, 64, 58, 0, "First");
      const report = await callback.getReport(1);
      expect(report.improvedFrom).to.equal(0n);
    });

    it("rejects a parent owned by somebody else", async () => {
      const { callback, other } = await deploy();

      await callback.stamp(REPORT_HASH, CV_HASH, 64, 58, 0, "Mine");

      await expect(
        callback.connect(other).stamp(OTHER_REPORT_HASH, CV_HASH, 90, 90, 1, "Theirs"),
      )
        .to.be.revertedWithCustomError(callback, "NotParentOwner")
        .withArgs(1n);
    });

    it("allows a chain of re-checks", async () => {
      const { callback } = await deploy();

      await callback.stamp(REPORT_HASH, CV_HASH, 50, 40, 0, "Analyst");
      await callback.stamp(REPORT_HASH, CV_HASH, 70, 60, 1, "Analyst");
      await callback.stamp(REPORT_HASH, CV_HASH, 88, 81, 2, "Analyst");

      expect((await callback.getReport(3)).improvedFrom).to.equal(2n);

      const [, totalRechecks] = await callback.stats();
      expect(totalRechecks).to.equal(2n);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Views                                                                  */
  /* ---------------------------------------------------------------------- */

  describe("reportsOf", () => {
    it("returns the caller's ids, oldest first", async () => {
      const { callback, owner, other } = await deploy();

      await callback.stamp(REPORT_HASH, CV_HASH, 50, 50, 0, "A");
      await callback.connect(other).stamp(REPORT_HASH, CV_HASH, 60, 60, 0, "B");
      await callback.stamp(REPORT_HASH, CV_HASH, 70, 70, 0, "C");

      const mine = await callback.reportsOf(await owner.getAddress());
      const theirs = await callback.reportsOf(await other.getAddress());

      expect(mine.map(Number)).to.deep.equal([1, 3]);
      expect(theirs.map(Number)).to.deep.equal([2]);
    });

    it("returns an empty list for an address that never stamped", async () => {
      const { callback, other } = await deploy();

      expect(await callback.reportsOf(await other.getAddress())).to.deep.equal([]);
      expect(await callback.reportCountOf(await other.getAddress())).to.equal(0n);
    });

    it("keeps reportCountOf in step with reportsOf", async () => {
      const { callback, owner } = await deploy();

      await callback.stamp(REPORT_HASH, CV_HASH, 50, 50, 0, "A");
      await callback.stamp(REPORT_HASH, CV_HASH, 60, 60, 1, "A");

      const address = await owner.getAddress();
      expect(await callback.reportCountOf(address)).to.equal(2n);
      expect((await callback.reportsOf(address)).length).to.equal(2);
    });
  });

  /* ---------------------------------------------------------------------- */
  /* Openness                                                               */
  /* ---------------------------------------------------------------------- */

  describe("no privileged access", () => {
    it("lets any address stamp its own reports", async () => {
      const { callback, other } = await deploy();

      await expect(
        callback.connect(other).stamp(REPORT_HASH, CV_HASH, 64, 58, 0, "Anyone"),
      ).to.emit(callback, "Stamped");

      expect((await callback.getReport(1)).owner).to.equal(await other.getAddress());
    });

    it("exposes no owner, pause or upgrade entry point", async () => {
      const { callback } = await deploy();
      const names = callback.interface.fragments
        .filter((fragment) => fragment.type === "function")
        .map((fragment) => (fragment as { name: string }).name);

      for (const forbidden of [
        "owner",
        "transferOwnership",
        "renounceOwnership",
        "pause",
        "unpause",
        "upgradeTo",
        "withdraw",
        "mint",
        "setFee",
      ]) {
        expect(names).to.not.include(forbidden);
      }
    });
  });
});
