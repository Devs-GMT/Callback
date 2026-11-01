// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Callback
 * @notice Stamps a CV-improvement report on BOT Chain so a job seeker can
 *         prove their progress over time.
 *
 * @dev Privacy is the whole design constraint. Nothing identifying goes on
 *      chain: no name, no email, no CV text. What is stored is
 *
 *        - `reportHash`: a hash of the report, so the off-chain report can be
 *          shown to match this stamp;
 *        - `cvHash`: SHA-256 of (CV text + a random salt that never leaves the
 *          user's browser). The salt means nobody can confirm a guessed CV
 *          against the hash, which a bare hash of the CV text would allow;
 *        - two scores, the job title, and a timestamp.
 *
 *      There are no tokens, no payments, no admin role and no upgrade path.
 *      Anyone can stamp their own reports and nobody can alter or remove them.
 *
 *      Honesty note, repeated in the README: the scores are computed by the
 *      Callback app, so a stamp proves the user's own progress over time. It
 *      is not a claim that an employer agreed with the score.
 */
contract Callback {
    /// @notice One stamped report.
    struct Report {
        /// @dev Who stamped it.
        address owner;
        /// @dev Hash of the off-chain report.
        bytes32 reportHash;
        /// @dev Salted SHA-256 of the CV text.
        bytes32 cvHash;
        /// @dev 0 to 100.
        uint8 atsScore;
        /// @dev 0 to 100.
        uint8 matchScore;
        /// @dev Id of the report this one improved on, or 0 if it is a first check.
        uint256 improvedFrom;
        /// @dev Up to 60 bytes.
        string jobTitle;
        /// @dev Block timestamp of the stamp.
        uint64 at;
    }

    /**
     * @notice All stamped reports, indexed by id.
     *
     * @dev Index 0 holds an unusable placeholder written in the constructor so
     *      that valid ids start at 1. That matters because `improvedFrom == 0`
     *      is how a first check is distinguished from a re-check; without the
     *      placeholder, id 0 would be both a real report and the "none"
     *      sentinel. The placeholder's owner is `address(0)`, so the ownership
     *      check in `stamp` can never accept it as a parent.
     */
    Report[] public reports;

    /// @notice Report ids belonging to each address, in stamping order.
    mapping(address => uint256[]) private byOwner;

    /// @notice How many reports recorded an `improvedFrom`, i.e. re-checks.
    uint256 private recheckCount;

    /// @notice Emitted once per stamp.
    event Stamped(
        uint256 indexed id,
        address indexed owner,
        uint8 atsScore,
        uint8 matchScore
    );

    /// @dev A score above 100 is not a score this app can produce.
    error ScoreOutOfRange(uint8 score);
    /// @dev Job titles are capped so storage cost stays predictable.
    error JobTitleTooLong(uint256 length);
    /// @dev A report must be empty of neither hash, or it proves nothing.
    error EmptyHash();
    /// @dev `improvedFrom` must be an existing report.
    error UnknownParent(uint256 id);
    /// @dev `improvedFrom` must be a report the caller already owns.
    error NotParentOwner(uint256 id);

    uint8 private constant MAX_SCORE = 100;
    uint256 private constant MAX_JOB_TITLE_BYTES = 60;

    constructor() {
        // Reserve index 0. Every field is zero, and `owner == address(0)` keeps
        // it from ever passing the parent-ownership check.
        reports.push(
            Report({
                owner: address(0),
                reportHash: bytes32(0),
                cvHash: bytes32(0),
                atsScore: 0,
                matchScore: 0,
                improvedFrom: 0,
                jobTitle: "",
                at: 0
            })
        );
    }

    /**
     * @notice Stamp a report.
     * @param reportHash Hash of the off-chain report. Must be non-zero.
     * @param cvHash Salted SHA-256 of the CV text. Must be non-zero.
     * @param atsScore ATS score, 0 to 100.
     * @param matchScore Job match score, 0 to 100.
     * @param improvedFrom Id of an earlier report of yours, or 0 for a first check.
     * @param jobTitle Job title, at most 60 bytes.
     * @return id The new report's id, starting at 1.
     */
    function stamp(
        bytes32 reportHash,
        bytes32 cvHash,
        uint8 atsScore,
        uint8 matchScore,
        uint256 improvedFrom,
        string calldata jobTitle
    ) external returns (uint256 id) {
        if (atsScore > MAX_SCORE) revert ScoreOutOfRange(atsScore);
        if (matchScore > MAX_SCORE) revert ScoreOutOfRange(matchScore);
        if (reportHash == bytes32(0) || cvHash == bytes32(0)) revert EmptyHash();

        uint256 titleLength = bytes(jobTitle).length;
        if (titleLength > MAX_JOB_TITLE_BYTES) revert JobTitleTooLong(titleLength);

        if (improvedFrom != 0) {
            // Must already exist. Since ids are assigned in order and this
            // report is not pushed yet, an existing id is necessarily earlier.
            if (improvedFrom >= reports.length) revert UnknownParent(improvedFrom);
            if (reports[improvedFrom].owner != msg.sender) {
                revert NotParentOwner(improvedFrom);
            }
            recheckCount += 1;
        }

        id = reports.length;

        reports.push(
            Report({
                owner: msg.sender,
                reportHash: reportHash,
                cvHash: cvHash,
                atsScore: atsScore,
                matchScore: matchScore,
                improvedFrom: improvedFrom,
                jobTitle: jobTitle,
                at: uint64(block.timestamp)
            })
        );

        byOwner[msg.sender].push(id);

        emit Stamped(id, msg.sender, atsScore, matchScore);
    }

    /**
     * @notice Read one report.
     * @dev Reverts for id 0 and for ids that do not exist, so a bad share link
     *      fails loudly instead of returning a zeroed struct that the UI would
     *      render as a real report.
     */
    function getReport(uint256 id) external view returns (Report memory) {
        if (id == 0 || id >= reports.length) revert UnknownParent(id);
        return reports[id];
    }

    /// @notice Every report id belonging to `owner`, oldest first.
    function reportsOf(address owner) external view returns (uint256[] memory) {
        return byOwner[owner];
    }

    /**
     * @notice Totals for the footer's live counter.
     * @return totalReports Reports stamped, excluding the index 0 placeholder.
     * @return totalRechecks How many of those were re-checks.
     */
    function stats()
        external
        view
        returns (uint256 totalReports, uint256 totalRechecks)
    {
        totalReports = reports.length - 1;
        totalRechecks = recheckCount;
    }

    /// @notice Convenience for paging `reportsOf` without reading the array.
    function reportCountOf(address owner) external view returns (uint256) {
        return byOwner[owner].length;
    }
}
