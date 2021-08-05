"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Company = require("./company.js");
const Jobs = require("./jobs")
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */
describe("create job",  function(){

  const newCompany = {
    handle: "new",
    name: "New",
    description: "New Description",
    numEmployees: 1,
    logoUrl: "http://new.img",
  };

  const newJob = {
    title: "newPosition",
    salary: 100000,
    equity: 0.5,
    companyHandle: "new"
  };

  test("Jobs create method", async function(){
    let testCompany = await Company.create(newCompany);
    let job = await Jobs.create(newJob);
    expect(job).toEqual({
        id: expect.any(Number),
        title: "newPosition",
        salary: 100000,
        equity: "0.5",
        company_handle: "new"
      })

    const result = await db.query( 
    `SELECT title, salary, equity, company_handle 
    FROM jobs
    WHERE title = 'newPosition'`);

    expect(result.rows).toEqual([{
        title: "newPosition",
        salary: 100000,
        equity: "0.5",
        company_handle: "new"
      }]);
});
});

