const { BadRequestError } = require("../expressError");

// THIS NEEDS SOME GREAT DOCUMENTATION.

/**  
 * dataToUpdate takes in an object of column,value pairs of values to update
 * jsToSql is an object of JS column name keys and SQL column name values
 * dataToUpdate ex. { firstName:"simon", lastName:"zhang" }
 * jsToSql ex. {firstName:"first_name", lastName: "last_name"}
 *
 * returns SQL SET string and an array of data to fill in SET values
 * { setCols :'"first_name"=$1', '"last_name"=$2' ,
 * values: ["simon", "zhang"] }
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

/**
 * search is request body that may include fields to filter by
 * ex. {"minEmployees" : 100, "maxEmployees": 1000}
 * 
 * returns SQL WHERE conditions and array of data to fill in conditions
 * { setCols :'"numEmployees >= $1 AND numEmployees <= $2',
 * values: [100, 1000] }
 */
//move this to models to company, it's not generaic enough to warrant as we use it only in the company models
//we know what our keys are
function sqlForCompanyFilter(search) {
  const keys = Object.keys(search);
  
  if (search.minEmployees > search.maxEmployees) {
    throw new BadRequestError("minEmployees must be less than or equal to maxEmployees")
  }
  const sqlFilter = []
  let idx = 1
  if ( search.name ) {
    search.name = `%${search.name}%`
    sqlFilter.push(`"name" ILIKE $${idx }`);
    idx++
  }
  if ( search.minEmployees ) {
    sqlFilter.push(`"num_employees" >= $${idx }`);
    idx++
  }
  if ( search.maxEmployees ) {
    sqlFilter.push(`"num_employees" <= $${idx }`);
    idx++
  }


  return {
    sqlFilter: sqlFilter.join(" AND "),
    values: Object.values(search),
  };
}

module.exports = { 
  sqlForPartialUpdate,
  sqlForCompanyFilter 
};
