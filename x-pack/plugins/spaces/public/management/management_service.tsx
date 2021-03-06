/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { StartServicesAccessor, Capabilities } from 'src/core/public';
import {
  ManagementSetup,
  ManagementApp,
  ManagementSectionId,
} from '../../../../../src/plugins/management/public';
import { SecurityLicense } from '../../../security/public';
import { SpacesManager } from '../spaces_manager';
import { PluginsStart } from '../plugin';
import { spacesManagementApp } from './spaces_management_app';

interface SetupDeps {
  management: ManagementSetup;
  getStartServices: StartServicesAccessor<PluginsStart>;
  spacesManager: SpacesManager;
  securityLicense?: SecurityLicense;
}

interface StartDeps {
  capabilities: Capabilities;
}
export class ManagementService {
  private registeredSpacesManagementApp?: ManagementApp;

  public setup({ getStartServices, management, spacesManager, securityLicense }: SetupDeps) {
    this.registeredSpacesManagementApp = management.sections
      .getSection(ManagementSectionId.Kibana)
      .registerApp(
        spacesManagementApp.create({ getStartServices, spacesManager, securityLicense })
      );
  }

  public start({ capabilities }: StartDeps) {
    if (!capabilities.spaces.manage) {
      this.disableSpacesApp();
    }
  }

  public stop() {
    this.disableSpacesApp();
  }

  private disableSpacesApp() {
    if (this.registeredSpacesManagementApp) {
      this.registeredSpacesManagementApp.disable();
    }
  }
}
