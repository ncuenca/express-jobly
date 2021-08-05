"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job")
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
describe("create job",  function() {
  const newJob = {

    title: "newPosition",
    salary: 100000,
    equity: 0.5,
    companyHandle: "c1"
  };

  test("Jobs create method", async function(){
    let job = await Job.create(newJob);
    expect(job).toEqual({
        id: expect.any(Number),
        title: "newPosition",
        salary: 100000,
        equity: "0.5",
        companyHandle: "c1"
      });

    const result = await db.query( 
    `SELECT title, salary, equity, company_handle
    FROM jobs
    WHERE title = 'newPosition'`);

    expect(result.rows).toEqual([{
        title: "newPosition",
        salary: 100000,
        equity: "0.5",
        company_handle: "c1"
      }]);
  });
});

/************************************** findAll */

describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: 't1',
        salary: 100000,
        equity: "0.02",
        companyHandle: 'c1',
      },
      {
        id: expect.any(Number),
        title: 't2',
        salary: 120000,
        equity: "0",
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: 't3',
        salary: 160000,
        equity: "0",
        companyHandle: "c2",
      },
    ]);
  });
});


/************************************** findFilter */

describe("findilter", function () {
  test("works: w/ title", async function () {
    let jobs = await Job.findFilter({
        title: 't'
    });
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: 't1',
        salary: 100000,
        equity: "0.02",
        companyHandle: 'c1',
      },
      {
        id: expect.any(Number),
        title: 't2',
        salary: 120000,
        equity: "0",
        companyHandle: "c2",
      },
      {
        id: expect.any(Number),
        title: 't3',
        salary: 160000,
        equity: "0",
        companyHandle: "c2",
      },
    ]);
  });

  test("works: w/ title no results" , async function () {
    let jobs = await Job.findFilter({
        title: 'c'
    });
    expect(jobs).toEqual([]);
  });

  test("works: w/ filter equity > 0" , async function () {
    let jobs = await Job.findFilter({
        hasEquity: true,
    });
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: 't1',
        salary: 100000,
        equity: "0.02",
        companyHandle: 'c1',
      },
    ]);
  });

  test("works: w/ filter min salary > 115000" , async function () {
      let jobs = await Job.findFilter({
          minSalary:115000
      });
      expect(jobs).toEqual([
        {
          id: expect.any(Number),
          title: 't2',
          salary: 120000,
          equity: "0",
          companyHandle: "c2",
        },
        {
          id: expect.any(Number),
          title: 't3',
          salary: 160000,
          equity: "0",
          companyHandle: "c2",
        },
      ]);
  });

  test("invalid key throws bad request error" , async function () {
    try {
      await Job.findFilter({
        maxSalary:115000
    });
      fail();
    } catch (err) {
      expect(err instanceof BadRequestError).toBeTruthy();
    }
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    let jobId = await getJobId();
    let job = await Job.get(jobId);
    expect(job).toEqual({
      id: expect.any(Number),
      title: 't1',
      salary: 100000,
      equity: "0.02",
      companyHandle: 'c1',
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(0);
      fail();
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {
  const updateData = {
    title:"updated",
    salary:1000000,
    equity:1,
  };

  test("works", async function () {
    let jobId = await getJobId();
    let job = await Job.update(jobId, updateData);
    expect(job).toEqual({
      id:jobId,
      title:"updated",
      salary:1000000,
      equity:"1",
      companyHandle:'c1'
    });

    const result = await db.query(
          `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${jobId}`);
    expect(result.rows[0]).toEqual({
      id:jobId,
      title:"updated",
      salary:1000000,
      equity:"1",
      company_handle:'c1'
    });
  });

  // test("works: null fields", async function () {
  //   const updateDataSetNulls = {
  //     name: "New",
  //     description: "New Description",
  //     numEmployees: null,
  //     logoUrl: null,
  //   };

  //   let company = await Company.update("c1", updateDataSetNulls);
  //   expect(company).toEqual({
  //     handle: "c1",
  //     ...updateDataSetNulls,
  //   });

  //   const result = await db.query(
  //         `SELECT handle, name, description, num_employees, logo_url
  //          FROM companies
  //          WHERE handle = 'c1'`);
  //   expect(result.rows).toEqual([{
  //     handle: "c1",
  //     name: "New",
  //     description: "New Description",
  //     num_employees: null,
  //     logo_url: null,
  //   }]);
  // });

  // test("not found if no such company", async function () {
  //   try {
  //     await Company.update("nope", updateData);
  //     fail();
  //   } catch (err) {
  //     expect(err instanceof NotFoundError).toBeTruthy();
  //   }
  // });

  // test("bad request with no data", async function () {
  //   try {
  //     await Company.update("c1", {});
  //     fail();
  //   } catch (err) {
  //     expect(err instanceof BadRequestError).toBeTruthy();
  //   }
  // });
});

/************************************** HELPER FUNCTION */
async function getJobId() {
  let result = await db.query(`
  SELECT id
  FROM jobs
  WHERE title = 't1'
  `);
  console.log("THIS IS RESULT ID ======= ", result.rows[0].id)
  return result.rows[0].id;
}