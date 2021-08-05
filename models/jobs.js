"use strict"

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");


/** Related functions for jobs */

class Jobs{

   /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle }
   * */
  static async create({ title, salary, equity, companyHandle }){
    const result = await db.query(
      `INSERT INTO jobs(
      title, 
      salary,
      equity,
      company_handle)
      VALUES
        ($1, $2, $3, $4)
      RETURNING id, title, salary, equity, company_handle `,
      [title, salary, equity, companyHandle],
    );

  const job = result.rows[0];
  return job;
  }

   /** Find all job.
   *
   * Returns { id, title, salary, equity, company_handle }
   * */

  static async findAll(){
    const JobsRes = await db.query(
      `SELECT 
      title,
      salary,
      equity,
      company_handle AS "companyHandle"
      FROM jobs
      ORDER BY companyHandle, title
      `
    );
    return JobsRes.rows;
  }

    /** Find jobs by filter.
   * 
   * Returns [{ id, title, salary, equity, company_handle }, ...]
   * */

  static async findFilter(search){
      const { sqlFilter , values } = Jobs.sqlForCompanyFilter(search);
      const querySQL = 
      `SELECT 
      title,
      salary,
      equity,
      company_handle AS "companyHandle"
      FROM jobs
      WHERE ${sqlFilter}
      `
      const filteredJobsRes = await db.query(querySQL, values);
      return filteredJobsRes;
    }

     /** Given a jobs handle, return data about jobs.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/


  static async get(id){
    const jobsRes = await db.query(
      `SELECT 
      title,
      salary,
      equity,
      company_handle AS "companyHandle"
      FROM jobs
      WHERE ${id}
      `
    );
    const job = job.rows[0];
    if(!job) throw new NotFoundError(`No company: ${id}`);
    return job;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws NotFoundError if not found.
   */


  static async update(id, data){
    const { setCols, values } = sqlForPartialUpdate(
      data, {
        companyHandle:"company_handle"
      });
    
    const idVarIdx = "$"+(values.length+1);

    const querySQL = 
    `UPDATE jobs
    SET ${setCols}
    WHERE id = ${idVarIdx}
    RETURNING id, title, salary, equity, company_handle AS "companyHandle"
    `
    const result = await db.query(querySQL,[...values,id]);
    const job = result.rows[0];

    if( !job ) throw new NotFoundError(`No job: ${id}`)
    
    return job
  }
    
  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

   static async remove(id) {
    const result = await db.query(
        `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
        [id]);
    const company = result.rows[0];
    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }


 /******************************** HELPER FUNCTIONS *********************************/
 
 /**
 * search is request body that may include fields to filter by
 * ex. {"minSalary" : 100000, "hasEquity": true}
 * 
 * returns SQL WHERE conditions and array of data to fill in conditions
 * { sqlFilter :'"salary >= $1 AND equity = $2',
 * values: [100000, true] }
 */
 
 static sqlForJobsFilter(search) {
  const keys = Object.keys(search);

  const valid_keys = new Set(['title', 'minSalary', 'hasEquity']);

  keys.forEach(function(key) {
    if (!(valid_keys.has(key))) {
      throw new BadRequestError("Invalid filter");
    } 
  }); 

  const sqlFilter = []
  let idx = 1
  if ( search.title ) {
    search.title = `%${search.title}%`
    sqlFilter.push(`"title" ILIKE $${idx }`);
    idx++
  }
  if ( search.minSalary ) {
    sqlFilter.push(`"salary" >= $${idx }`);
    idx++
  }
  if ( search.hasEquity ) {
    sqlFilter.push(`"equity" <= $${idx }`);
    idx++
  }

  return {
    sqlFilter: sqlFilter.join(" AND "),
    values: Object.values(search),
  };
};

}

module.exports = Jobs;