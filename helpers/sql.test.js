"use strict"

const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate, sqlForCompanyFilter } = require("./sql");


describe("sqlForPartialUpdate", function () {
  test("creates a SET sql param and a value field ", function () {
    const data = {
      firstName: "Nathan",
      lastName: "Nathan",
      age: 23
    };
    const jsToSql = {
      firstName: "first_name",
      lastName: "last_name"
    };
    const query = sqlForPartialUpdate(data, jsToSql);

    expect(query).toEqual(
      {
        setCols: '"first_name"=$1, "last_name"=$2, "age"=$3',
        values: ['Nathan', 'Nathan', 23]
      }
    );
  });

  test("expecting empty data to throw error ", function () {
    const data = {
    };
    const jsToSql = {
      firstName: "first_name",
      lastName: "last_name"
    };

    function badSQLPartialUpdate() {
      sqlForPartialUpdate(data, jsToSql);
    }
    expect(badSQLPartialUpdate).toThrowError(BadRequestError);
  });
});

describe("sqlForCompanyFilter", function () {
  test("creates SQL string for correct WHERE conditions and values ", function () {
    const search = {
      name: "nathan",
      minEmployees: 100,
      maxEmployees: 1000
    };
    const query = sqlForCompanyFilter(search);

    expect(query).toEqual(
      {
        sqlFilter: '"name" ILIKE $1 AND "num_employees" >= $2 AND "num_employees" <= $3',
        values: ['nathan', 100, 1000]
      }
    );
  });

  test("minEmployees > maxEmployees should return a Bad Request Error ", function () {
    const search = {
      name: "nathan",
      minEmployees: 1000,
      maxEmployees: 100
    };

    function badSQLForCompanyFilter() {
      sqlForCompanyFilter(search)
    }
    expect(badSQLForCompanyFilter).toThrowError(BadRequestError)
  });
});