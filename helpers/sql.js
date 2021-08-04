const { BadRequestError } = require("../expressError");

// THIS NEEDS SOME GREAT DOCUMENTATION.

/**  dataToUpdate takes in an object of column,value pairs of values to update
 * jsToSql is an object of JS column name keys and SQL column name values
 * { firstName, lastName, }, {firstName:"first_name", lastName: "last_name"} =>
 *
 * returns SQL SET string and an array of data to fill in input fields
 * { setCols :['"first_name"=$1', '"last_name"=$2'] ,
 * values: [FirstName, LastName ] }
 */


function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
    `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

function sqlForCompanyFilter(search) {
  const keys = Object.keys(search);
  if (search["minEmployees"] > search["maxEmployees"]) {
    throw new BadRequestError
  }
  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const sqlFilter = keys.map((colName, idx) => {
    if (colName === 'name') {
      `"name" ILIKE $${idx + 1}`
    }
    if (colName === 'minEmployees') {
      `"num_employees" >= $${idx + 1}`
    }
    if (colName === 'maxEmployees') {
      `"num_employees" <= $${idx + 1}`
    }
  }
  );
  return {
    sqlFilter: sqlFilter.join(" AND "),
    values: Object.values(search),
  };
}

module.exports = { sqlForPartialUpdate,
sqlForCompanyFilter };
