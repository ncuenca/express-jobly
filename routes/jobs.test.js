"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  a1Token
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "newPosition",
    salary: 100000,
    equity: 0.5,
    companyHandle:"c1"
  };

  test("ok for admins", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      job:{
      id: expect.any(Number),
      title: "newPosition",
      salary: 100000,
      equity: "0.5",
      companyHandle:"c1"
    }});
  });

  test("non-admin users will throw Unauthorized Error", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({"error": {
            "message": "You must be an administrator to do this",
            "status": 401,
          }});
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "new",
        salary: 10
      })
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
          title: 99999,
          salary: 100000,
          equity: 0.5,
          companyHandle:"c1"
        })
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
        [
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
          }
        ],
    });
  });

  test("ok for anon with filter", async function () {
    const query = { title: 't3' }
    const resp = await (request(app).get("/jobs").send(query));
    expect(resp.body).toEqual({ jobs:[
      {
      id: expect.any(Number),
      title: 't3',
      salary: 160000,
      equity: "0",
      companyHandle: "c2",
      }
    ]});
  });

  test("Sad Path for invalid inputs", async function () {
    const query = { title: 600, salary: "fsdfd", hasEquity: "ffdfd" }
    const resp = await (request(app).get("/jobs").send(query));

    expect(resp.body).toEqual({
      "error": {
        "message": [
          "instance.title is not of a type(s) string",
          "instance.salary is not of a type(s) integer",
          "instance.hasEquity is not of a type(s) boolean"
        ],
        "status": 400
      }
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE companies CASCADE");
    const resp = await request(app)
      .get("/companies")
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});


/************************************** GET /jobs/:handle */

describe("GET /jobs/:handle", function () {
  test("works for anon", async function () {
    let jobId = await getJobId();
    const resp = await request(app).get(`/jobs/${jobId}`);
    expect(resp.body).toEqual({job: {
            id: expect.any(Number),
            title: 't1',
            salary: 100000,
            equity: "0.02",
            companyHandle: 'c1',
    }});
  });

  test("not found for no such company", async function () {
    const resp = await request(app).get(`/jobs/0`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /job/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admin", async function () {
    let jobId = await getJobId();
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        title: "updatePosition",
      })
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.body).toEqual({
      job: {
        id: expect.any(Number),
        title: 'updatePosition',
        salary: 100000,
        equity: "0.02",
        companyHandle: 'c1',
      },
    });
  });

  test("non-admin users will throw Unauthorized Error", async function () {
    let jobId = await getJobId();
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        name: "will-Fail",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({"error": {
            "message": "You must be an administrator to do this",
            "status": 401,
          }});
  });

  test("unauth for anon", async function () {
    let jobId = await getJobId();
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        name: "will-fail",
      });
    expect(resp.statusCode).toEqual(401);
  })

  test("not found on no such job", async function () {
    const badJobId = 0;
    const resp = await request(app)
      .patch(`/jobs/${badJobId}`)
      .send({
        title: "bad id",
      })
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on id change attempt", async function () {
    const jobId = getJobId;
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        id: 25,
      })
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const jobId = getJobId;
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        salary: "not-really-a-number",
      })
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

});


/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admins", async function () {
    const jobId = await getJobId();
    const resp = await request(app)
      .delete(`/jobs/${jobId}`)
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.body).toEqual({ deleted: String(jobId) });
  });

  test("non-admin users will throw Unauthorized Error", async function () {
    const jobId = await getJobId();
    const resp = await request(app)
      .delete(`/jobs/${jobId}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({"error": {
            "message": "You must be an administrator to do this",
            "status": 401,
          }});
  });

  test("unauth for anon", async function () {
    const jobId = await getJobId();
    const resp = await request(app)
      .delete(`/jobs/${jobId}`)
    expect(resp.statusCode).toEqual(401);
  });

  test("not found for no such company", async function () {
    const badJobId = 0;
    const resp = await request(app)
      .delete(`/jobs/${badJobId}`)
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});


/************************************** HELPER FUNCTION */
async function getJobId() {
  
  let result = await db.query(`
  SELECT id
  FROM jobs
  WHERE title = 't1'
  `);
  return result.rows[0].id;
}