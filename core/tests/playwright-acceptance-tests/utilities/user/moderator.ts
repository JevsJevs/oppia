// Copyright 2026 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Moderator user utility file.
 */

import {Page, expect} from '@playwright/test';
import {BaseUser} from '../common/playwright-utils';
import testConstants from '../common/test-constants';
import {showMessage} from '../common/show-message';

const moderatorPageUrl = testConstants.URLs.ModeratorPage;

const featuredActivitiesTab = '.e2e-test-featured-activities-tab-link';
const featuredActivitiesHeaderSelector = '.e2e-test-featured-activities-header';
const explorationIdField = 'input[aria-label="text input"]';
const featuredActivityRowSelector =
  '.e2e-test-schema-based-list-editor-table-row';
const deleteFeaturedActivityButton = '.e2e-test-delete-list-entry';
const toastMessageSelector = '.e2e-test-toast-message';
const errorModalSelector = '.oppia-error-modal-window';
const errorModalToggleDetailsSelector = '.e2e-test-error-details-toggle-link';
const errorModalDetailsContentSelector = '.e2e-test-error-details-content';
const errorModalCloseButtonSelector = '.e2e-test-close-button';

const moderatorPageContainerSelector = '.e2e-test-moderator-page';
const commitRowSelector = '.e2e-test-commit-row';
const commitTableHeaderRowSelector = '.e2e-test-commit-table-header-row';
const explorationEditorContainerSelector = 'oppia-exploration-editor-page-root';

interface CommitProperties {
  timestamp: string;
  exploration: string;
  category: string;
  username: string;
  commitMessage: string;
  isCommunityOwned: string;
}

export class Moderator extends BaseUser {
  /**
   * Navigates to the moderator page.
   */
  async navigateToModeratorPage(): Promise<void> {
    await this.goto(moderatorPageUrl);
  }

  /**
   * Navigates to the Featured Activities tab of the moderator page.
   */
  async navigateToFeaturedActivitiesTab(): Promise<void> {
    await this.expectElementToBeVisible(featuredActivitiesTab);
    await this.clickOnElementWithSelector(featuredActivitiesTab);
    await this.expectElementToBeVisible(featuredActivitiesHeaderSelector);
  }

  /**
   * Adds an activity to the featured activities list and saves it.
   * @param {string} explorationId - The ID of the exploration to feature.
   * @param {number} activityIndex - The 0-based index of the new row.
   */
  async featureActivity(
    explorationId: string,
    activityIndex: number = 0
  ): Promise<void> {
    await this.clickOnElementWithText('Add element');

    const idFields = this.page.locator(explorationIdField);
    await expect(idFields).toHaveCount(activityIndex + 1);
    const idField = idFields.nth(activityIndex);
    await idField.fill(explorationId);
    await idField.press('Enter');
    await expect(idField).toHaveValue(explorationId);

    await this.clickOnElementWithText('Save Featured Activities');
    await this.expectSaveResultToBeShown();
  }

  /**
   * Removes the featured activity at the given position and saves the list.
   * @param {number} index - The 1-based index of the activity to remove.
   */
  async unfeatureActivityAtIndex(index: number): Promise<void> {
    const rows = this.page.locator(featuredActivityRowSelector);
    await rows.first().waitFor({state: 'visible'});
    const rowCount = await rows.count();
    if (index < 1 || index > rowCount) {
      throw new Error(
        `Invalid index ${index}. Found ${rowCount} featured activities.`
      );
    }

    await rows
      .nth(index - 1)
      .locator(deleteFeaturedActivityButton)
      .click();
    await expect(rows).toHaveCount(rowCount - 1);

    await this.clickOnElementWithText('Save Featured Activities');
    await this.expectSaveResultToBeShown();
  }

  /**
   * Checks that saving featured activities showed either the success toast
   * or the error modal.
   */
  private async expectSaveResultToBeShown(): Promise<void> {
    await expect(
      this.page
        .locator(`${toastMessageSelector}, ${errorModalSelector}`)
        .first()
    ).toBeVisible();
    showMessage('Featured activities save result is shown.');
  }

  /**
   * Checks that the error modal is visible.
   */
  async expectErrorModalToBeVisible(): Promise<void> {
    await this.expectElementToBeVisible(errorModalSelector);
  }

  /**
   * Function to view a specific recent commit.
   * @param {number} commitIndex - The index of the commit to view.
   */
  private async getPropertiesOfCommit(
    commitIndex: number
  ): Promise<CommitProperties> {
    const commitRows = this.page.locator(commitRowSelector);
    const commitRowsLen = await commitRows.count();
    expect(commitRowsLen).toBeGreaterThan(0);

    commitIndex -= 1; // Adjusting to 0-based index.
    if (commitIndex < 0 || commitIndex >= commitRowsLen) {
      throw new Error('Invalid commit number');
    }

    const row = commitRows.nth(commitIndex);
    const timestamp = await row
      .locator('td:nth-child(1)')
      .evaluate(el => el.textContent);
    const exploration = await row
      .locator('td:nth-child(2) a')
      .evaluate(el => el.textContent);
    const category = await row
      .locator('td:nth-child(3)')
      .evaluate(el => el.textContent);
    const username = await row
      .locator('td:nth-child(4)')
      .evaluate(el => el.textContent);
    const commitMessage = await row
      .locator('td:nth-child(5)')
      .evaluate(el => el.textContent);
    const isCommunityOwned = await row
      .locator('td:nth-child(6)')
      .evaluate(el => el.textContent);

    if (
      !timestamp ||
      !exploration ||
      !category ||
      !username ||
      !commitMessage ||
      !isCommunityOwned
    ) {
      throw new Error('Failed to fetch commit properties');
    }

    return {
      timestamp,
      exploration,
      category,
      username,
      commitMessage,
      isCommunityOwned,
    };
  }

  /**
   * Opens the details of the error modal and checks its message.
   * @param {string} expectedMessage - The expected error message.
   */
  async expectErrorModalMessageToBe(expectedMessage: string): Promise<void> {
    await this.clickOnElementWithSelector(errorModalToggleDetailsSelector);
    await this.expectTextContentToContain(
      errorModalDetailsContentSelector,
      expectedMessage
    );
  }

  /**
   * Function to check the number of recent commits.
   * @param {number} expectedCount - The expected number of commits.
   */
  async expectNumberOfRecentCommits(expectedCount: number): Promise<void> {
    const commitRows = await this.page.locator(commitRowSelector);
    await expect(commitRows).toHaveCount(expectedCount);
    showMessage('Recent commits count matches expected count.');
  }

  /**
   * Function to check if the recent commits table has the expected columns.
   * @param {string[]} columnNames - The names of the columns to check.
   */
  async expectRecentCommitsTableToHaveColumns(
    columnNames: string[]
  ): Promise<void> {
    await this.expectElementToBeVisible(commitTableHeaderRowSelector);
    const commitTableColumnFields = await this.page
      .locator(`${commitTableHeaderRowSelector} th`)
      .evaluateAll(elements => elements.map(element => element.textContent));

    for (const columnName of columnNames) {
      expect(commitTableColumnFields).toContain(columnName);
    }
  }

  /**
   * Function to check if a specific commit has all the expected properties.
   * @param {number} commitIndex - The 1-based index of the commit to check.
   * @param {string[]} expectedProperties - The properties that the commit is expected to have.
   */
  async expectCommitToHaveProperties(
    commitIndex: number,
    expectedProperties: string[]
  ): Promise<void> {
    const commit = await this.getPropertiesOfCommit(commitIndex);

    for (const property of expectedProperties) {
      if (!(property in commit)) {
        throw new Error(`Commit does not have property: ${property}`);
      }
    }
    showMessage(`Commit ${commitIndex} has all expected properties.`);
  }

  /**
   * Checks if a specific commit has a specific property with a specific value.
   * @param {number} commitIndex - The 1-based index of the commit to check.
   * @param {string} property - The property to check.
   * @param {string} value - The value of the property to check.
   */
  async expectCommitPropertyToBe(
    commitIndex: number,
    property: keyof {
      timestamp: string;
      exploration: string;
      category: string;
      username: string;
      commitMessage: string;
      isCommunityOwned: string;
    },
    value: string
  ): Promise<void> {
    const commit = await this.getPropertiesOfCommit(commitIndex);

    if (!(property in commit)) {
      throw new Error(`Commit does not have property: ${property}`);
    }

    expect(commit[property]).toBe(value);
    showMessage(
      `Commit ${commitIndex} has property ${property} with value ${value}.`
    );
  }

  /**
   * Function to click on the exploration link in the recent commits table.
   * @param {number} commitIndex - The 1-based index of the commit to click on.
   */
  async clickOnExplorationLinkInRecentCommitsTable(
    commitIndex: number
  ): Promise<void> {
    const commitRows = await this.page.locator(commitRowSelector);
    const commitRowsLen = await commitRows.count();
    expect(commitRowsLen).toBeGreaterThan(0);

    commitIndex -= 1; // Adjusting to 0-based index.
    if (commitIndex < 0 || commitIndex >= commitRowsLen) {
      throw new Error('Invalid commit number');
    }

    const row = commitRows.nth(commitIndex);
    const explorationElement = await row.locator('td:nth-child(2) a');

    explorationElement.click();
    await this.page.waitForLoadState('load');
  }

  /**
   * Check if the user is in the exploration editor.
   * @param {string} explorationId - The ID of the exploration to check.
   */
  async expectToBeInExplorationEditor(explorationId?: string): Promise<void> {
    await this.expectElementToBeVisible(explorationEditorContainerSelector);

    if (explorationId) {
      await this.expectPageURLToContain(explorationId);
    }
  }

  /**
   * Check if the user is in the moderator page.
   */
  async expectToBeInModeratorPage(): Promise<void> {
    await this.expectElementToBeVisible(moderatorPageContainerSelector);
  }

  /**
   * Checks if the timestamps in the commits or feedback messages are in descending order.
   * @param {'commit' | 'feedback messages'} table - The table to check the timestamps in.
   */
  async expectTimestampToBeInDescendingOrder(
    table: 'commit' | 'feedback messages' = 'commit'
  ): Promise<void> {
    const selector = `.e2e-test-${table.replace(' ', '-')}-row`;
    await this.expectElementToBeVisible(selector);
    const rowElements = await this.page.locator(selector);
    const rawTimeValue1 = await rowElements.nth(0).evaluate(el => {
      return el.querySelector('td')?.textContent?.trim();
    });
    const rawTimeValue2 = await rowElements.nth(1).evaluate(el => {
      return el.querySelector('td')?.textContent?.trim();
    });
    const time1 = this.parseLocaleAbbreviatedDatetimeString(
      rawTimeValue1 as string
    );
    const time2 = this.parseLocaleAbbreviatedDatetimeString(
      rawTimeValue2 as string
    );

    expect(time1).toBeGreaterThanOrEqual(time2);
  }

  /**
   * Closes the error modal.
   */
  async closeErrorModal(): Promise<void> {
    await this.clickOnElementWithSelector(errorModalCloseButtonSelector);
    await this.expectElementToBeVisible(errorModalSelector, false);
  }
}

export let ModeratorFactory = (page: Page): Moderator => {
  return new Moderator(page);
};
