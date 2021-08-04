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

module.exports = { 
  sqlForPartialUpdate
};
