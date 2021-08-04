"use strict"

const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function () {
  test("creates a SET sql param and a value field ", function () {
    const data = {
      firstName: "Nathan",
      lastName: "Cuenca",
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
        values: ['Nathan', 'Cuenca', 23]
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

