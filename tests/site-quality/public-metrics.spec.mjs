import { expect, test } from "@playwright/test";
import { publishedDebates as debates } from "../../src/data/debates.js";
import { avatarsForSpeakerText } from "../../src/data/interlocutors.js";
import { interlocutorPath } from "../../src/seo.js";

function buildExpectedProfiles() {
  const profiles = new Map();

  function profileFor(person) {
    const profile = profiles.get(person.name) || {
      ...person,
      appearances: 0,
      teamAppearances: 0,
      totalScore: 0,
      totalOpponentScore: 0,
      records: [],
      opponents: new Map()
    };
    profiles.set(person.name, profile);
    return profile;
  }

  debates.forEach((debate) => {
    const pro = avatarsForSpeakerText(debate.sides.pro.speaker);
    const con = avatarsForSpeakerText(debate.sides.con.speaker);
    const oneOnOne = pro.length === 1 && con.length === 1;

    [...pro, ...con].forEach(profileFor);

    if (!oneOnOne) {
      [...pro, ...con].forEach((person) => {
        profileFor(person).teamAppearances += 1;
      });
      return;
    }
    if (debate.interlocutorRankingEligible === false) return;

    [
      { person: pro[0], opponent: con[0], sideKey: "pro", opponentSideKey: "con" },
      { person: con[0], opponent: pro[0], sideKey: "con", opponentSideKey: "pro" }
    ].forEach(({ person, opponent, sideKey, opponentSideKey }) => {
      const profile = profileFor(person);
      const score = debate.score[sideKey];
      const opponentScore = debate.score[opponentSideKey];
      const opponentRecord = profile.opponents.get(opponent.name) || {
        appearances: 0,
        totalScore: 0
      };

      profile.appearances += 1;
      profile.totalScore += score;
      profile.totalOpponentScore += opponentScore;
      profile.records.push({ debateId: debate.id, opponentScore, score });
      opponentRecord.appearances += 1;
      opponentRecord.totalScore += opponentScore;
      profile.opponents.set(opponent.name, opponentRecord);
    });
  });

  return [...profiles.values()]
    .map((profile) => ({
      ...profile,
      averageScore: profile.appearances ? profile.totalScore / profile.appearances : null,
      averageOpponentScore: profile.appearances
        ? profile.totalOpponentScore / profile.appearances
        : null
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

function median(values) {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

const expectedProfiles = buildExpectedProfiles();

async function expectOneDecimalDisplays(locator, label) {
  const values = (await locator.allTextContents()).map((value) => value.trim());
  expect(values.length, `${label} must include at least one displayed score`).toBeGreaterThan(0);
  values.forEach((value) => {
    expect(value, `${label} value ${value}`).toMatch(/^\d+\.\d$/);
  });
}

test("every interlocutor profile uses the same eligible one-on-one records", async ({ page }) => {
  test.setTimeout(240_000);

  for (const expected of expectedProfiles) {
    await page.goto(interlocutorPath(expected), { waitUntil: "domcontentloaded" });
    const profile = page.locator("main[data-profile-name]");
    await profile.waitFor();
    const actual = await profile.evaluate((element) => ({ ...element.dataset }));

    expect(actual.profileName, expected.name).toBe(expected.name);
    expect(Number(actual.oneOnOneCount), `${expected.name} one-on-one count`).toBe(expected.appearances);
    expect(Number(actual.teamCount), `${expected.name} team count`).toBe(expected.teamAppearances);

    if (!expected.appearances) {
      expect(actual.averageScore, `${expected.name} must not publish an individual average`).toBeUndefined();
      continue;
    }

    expect(Number(actual.averageScore), `${expected.name} average`).toBeCloseTo(expected.averageScore, 10);
    expect(Number(actual.opponentsAverage), `${expected.name} opponents' average`).toBeCloseTo(
      expected.averageOpponentScore,
      10
    );

    await expectOneDecimalDisplays(
      page.locator(
        ".profile-hero-scores .profile-metric:nth-child(-n+2) dd, [data-topic-name] > b, [data-opponent-name] > b"
      ),
      `${expected.name} profile averages`
    );

    const expectedOpponents = [...expected.opponents.entries()]
      .map(([name, record]) => ({
        name,
        appearances: record.appearances,
        average: record.totalScore / record.appearances
      }))
      .sort((first, second) => first.name.localeCompare(second.name));
    const actualOpponents = await page.locator("[data-opponent-name]").evaluateAll((elements) =>
      elements
        .map((element) => ({
          name: element.dataset.opponentName,
          appearances: Number(element.dataset.opponentMeetings),
          average: Number(element.dataset.opponentAverage)
        }))
        .sort((first, second) => first.name.localeCompare(second.name))
    );
    expect(actualOpponents, `${expected.name} opponent rows`).toEqual(expectedOpponents);

    const expectedRecords = [...expected.records].sort((first, second) =>
      first.debateId.localeCompare(second.debateId)
    );
    const actualRecords = await page.locator("[data-debate-record]").evaluateAll((elements) =>
      elements
        .map((element) => ({
          debateId: element.dataset.debateRecord,
          score: Number(element.dataset.personScore),
          opponentScore: Number(element.dataset.opponentScore)
        }))
        .sort((first, second) => first.debateId.localeCompare(second.debateId))
    );
    expect(actualRecords, `${expected.name} linked scorecards`).toEqual(expectedRecords);

    const distribution = page.locator(".profile-distribution");
    const distributionData = await distribution.evaluate((element) => ({ ...element.dataset }));
    const scores = expected.records.map((record) => record.score);
    expect(Number(distributionData.scoreMedian), `${expected.name} median`).toBe(median(scores));
    expect(Number(distributionData.scoreLowest), `${expected.name} range minimum`).toBe(Math.min(...scores));
    expect(Number(distributionData.scoreHighest), `${expected.name} range maximum`).toBe(Math.max(...scores));

    const bucketTotal = await distribution.locator("[data-score-count]").evaluateAll((elements) =>
      elements.reduce((total, element) => total + Number(element.dataset.scoreCount), 0)
    );
    expect(bucketTotal, `${expected.name} histogram total`).toBe(expected.appearances);
  }
});

test("rankings and comparison cards use the same site-wide averages", async ({ page }) => {
  await page.goto("/rankings/?minimum=3&sort=name", { waitUntil: "domcontentloaded" });
  await page.locator("[data-ranking-person]").first().waitFor();

  const expectedRankings = expectedProfiles.filter((profile) => profile.appearances >= 3);
  const actualRankings = await page.locator("[data-ranking-person]").evaluateAll((elements) =>
    elements.map((element) => ({
      name: element.dataset.rankingPerson,
      appearances: Number(element.dataset.appearances),
      average: Number(element.dataset.averageScore),
      opponentsAverage: Number(element.dataset.opponentsAverage)
    }))
  );

  expect(actualRankings).toEqual(
    expectedRankings.map((profile) => ({
      name: profile.name,
      appearances: profile.appearances,
      average: profile.averageScore,
      opponentsAverage: profile.averageOpponentScore
    }))
  );
  await expectOneDecimalDisplays(page.locator(".ranking-score strong"), "ranking averages");

  const first = expectedProfiles.find((profile) => profile.name === "Alex O'Connor");
  const second = expectedProfiles.find((profile) => profile.name === "William Lane Craig");
  await page.goto(
    "/rankings/?compare-a=Alex+O%27Connor&compare-b=William+Lane+Craig",
    { waitUntil: "domcontentloaded" }
  );
  await page.locator("[data-comparison-person]").first().waitFor();
  const comparison = await page.locator("[data-comparison-person]").evaluateAll((elements) =>
    elements.map((element) => ({
      name: element.dataset.comparisonPerson,
      appearances: Number(element.dataset.appearances),
      average: Number(element.dataset.averageScore),
      opponentsAverage: Number(element.dataset.opponentsAverage),
      bucketTotal: [...element.querySelectorAll("[data-score-count]")].reduce(
        (total, bucket) => total + Number(bucket.dataset.scoreCount),
        0
      )
    }))
  );

  expect(comparison).toEqual(
    [first, second].map((profile) => ({
      name: profile.name,
      appearances: profile.appearances,
      average: profile.averageScore,
      opponentsAverage: profile.averageOpponentScore,
      bucketTotal: profile.appearances
    }))
  );
  await expectOneDecimalDisplays(
    page.locator(".comparison-person-stats > div:nth-child(-n+2) dd"),
    "comparison averages"
  );
});
