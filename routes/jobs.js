"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobFilterSchema = require("../schemas/jobFilter.json");

const router = new express.Router();

/** POST / { job } =>  { job }
 *
 * job should be { title, salary, equity, companyHandle }
 *
 * Returns { id, title, salary, equity, companyHandle }
 *
 * Authorization required: login and admin
 */

 router.post("/", ensureAdmin, async function (req, res, next) {
  const validator = jsonschema.validate(req.body, jobNewSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }
  const job = await Job.create(req.body);
  return res.status(201).json({ job });
});

/** GET /  =>
 *   { jobs: [ { title, salary, equity, companyHandle }, ...] }
 *
 * Can filter on provided search filters:
 * - title
 * - salary
 * - hasEquity (true or false)
 *
 * Authorization required: none
 */

 router.get("/", async function (req, res, next) {
  const validator = jsonschema.validate(req.body, jobFilterSchema);
  if (!validator.valid) {
    const errs = validator.errors.map(e => e.stack);
    throw new BadRequestError(errs);
  }
  
  let jobs;
  if (Object.keys(req.body).length > 0) {
    jobs = await Job.findFilter(req.body);
  }
  else {
    jobs = await Job.findAll();
  }
  return res.json({ jobs });
});

module.exports = router;