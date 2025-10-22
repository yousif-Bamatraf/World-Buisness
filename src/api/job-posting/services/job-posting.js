'use strict';

/**
 * job-posting service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::job-posting.job-posting');
