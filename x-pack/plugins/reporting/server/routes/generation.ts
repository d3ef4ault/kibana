/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { errors as elasticsearchErrors } from 'elasticsearch';
import { kibanaResponseFactory } from 'src/core/server';
import { ReportingCore } from '../';
import { API_BASE_URL } from '../../common/constants';
import { LevelLogger as Logger } from '../lib';
import { registerGenerateFromJobParams } from './generate_from_jobparams';
import { registerGenerateCsvFromSavedObject } from './generate_from_savedobject';
import { registerGenerateCsvFromSavedObjectImmediate } from './generate_from_savedobject_immediate';
import { HandlerFunction } from './types';

const esErrors = elasticsearchErrors as Record<string, any>;

export function registerJobGenerationRoutes(reporting: ReportingCore, logger: Logger) {
  const config = reporting.getConfig();
  const downloadBaseUrl =
    config.kbnConfig.get('server', 'basePath') + `${API_BASE_URL}/jobs/download`;

  /*
   * Generates enqueued job details to use in responses
   */
  const handler: HandlerFunction = async (user, exportTypeId, jobParams, context, req, res) => {
    const licenseInfo = await reporting.getLicenseInfo();
    const licenseResults = licenseInfo[exportTypeId];

    if (!licenseResults) {
      return res.badRequest({ body: `Invalid export-type of ${exportTypeId}` });
    }

    if (!licenseResults.enableLinks) {
      return res.forbidden({ body: licenseResults.message });
    }

    const enqueueJob = await reporting.getEnqueueJob();
    const job = await enqueueJob(exportTypeId, jobParams, user, context, req);

    // return the queue's job information
    const jobJson = job.toJSON();

    return res.ok({
      headers: {
        'content-type': 'application/json',
      },
      body: {
        path: `${downloadBaseUrl}/${jobJson.id}`,
        job: jobJson,
      },
    });
  };

  function handleError(res: typeof kibanaResponseFactory, err: Error | Boom) {
    if (err instanceof Boom) {
      return res.customError({
        statusCode: err.output.statusCode,
        body: err.output.payload.message,
      });
    }

    if (err instanceof esErrors['401']) {
      return res.unauthorized({
        body: `Sorry, you aren't authenticated`,
      });
    }

    if (err instanceof esErrors['403']) {
      return res.forbidden({
        body: `Sorry, you are not authorized`,
      });
    }

    if (err instanceof esErrors['404']) {
      return res.notFound({
        body: err.message,
      });
    }

    return res.badRequest({
      body: err.message,
    });
  }

  registerGenerateFromJobParams(reporting, handler, handleError);

  // Register beta panel-action download-related API's
  if (config.get('csv', 'enablePanelActionDownload')) {
    registerGenerateCsvFromSavedObject(reporting, handler, handleError);
    registerGenerateCsvFromSavedObjectImmediate(reporting, handleError, logger);
  }
}
