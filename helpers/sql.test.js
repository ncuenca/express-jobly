"use strict"
const { BadRequestError } = require("../expressError")
const { sqlForPartialUpdate } = require("./sql")

// describe("createToken", function () {
//   test("works: not admin", function () {
//     const token = createToken({ username: "test", is_admin: false });
//     const payload = jwt.verify(token, SECRET_KEY);
//     expect(payload).toEqual({
//       iat: expect.any(Number),
//       username: "test",
//       isAdmin: false,
//     });
//   });


describe("sqlForPartialUpdate", function () {
  test("creates a SET sql param and a value field ", function () {
    const data = {
      firstName: "Nathan",
      lastName: "Nathan",
      age: 23
    }
    const jsToSql = {
      firstName: "first_name",
      lastName: "last_name"
    }
    const query = sqlForPartialUpdate(data, jsToSql)

    expect(query).toEqual(
      {
        setCols: '"first_name"=$1, "last_name"=$2, "age"=$3',
        values: ['Nathan', 'Nathan', 23]
      }
    )
  })

  test("expecting empty data to throw error ", function () {
    const data = {
    }
    const jsToSql = {
      firstName: "first_name",
      lastName: "last_name"
    }

    function badSQLPartialUpdate() {
      sqlForPartialUpdate(data, jsToSql)
    }
    expect(badSQLPartialUpdate).toThrowError(BadRequestError)
  })
})
