"use strict"

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");


/** Related functions for jobs */

class Job {

   /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, companyHandle }
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
      RETURNING id, title, salary, equity, company_handle as "companyHandle" `,
      [title, salary, equity, companyHandle],
    );

  const job = result.rows[0];
  return job;
  }

   /** Find all job.
   *
   * Returns { id, title, salary, equity, companyHandle }
   * */

  static async findAll(){
    const JobsRes = await db.query(
      `SELECT
      id,
      title,
      salary,
      equity,
      company_handle as "companyHandle"
      FROM jobs
      ORDER BY company_handle, title
      `
    );
    return JobsRes.rows;
  }

  /** Find jobs by filter.
   * 
   * Returns [{ id, title, salary, equity, companyHandle }, ...]
   * */

  static async findFilter(search){
      const { sqlFilter , values } = Job.sqlForJobFilter(search);
      const querySQL = 
      `SELECT 
      id,
      title,
      salary,
      equity,
      company_handle AS "companyHandle"
      FROM jobs
      WHERE ${sqlFilter}
      `
      const filteredJobsRes = await db.query(querySQL, values);
      return filteredJobsRes.rows;
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
      id,
      title,
      salary,
      equity,
      company_handle AS "companyHandle"
      FROM jobs
      WHERE id = $1`,
      [id]
    );
    const job = jobsRes.rows[0];
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
    const result = await db.query(querySQL,[...values, id]);
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
 
 static sqlForJobFilter(search) {
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
    sqlFilter.push(`"title" ILIKE $${idx}`);
    idx++
  }
  if ( search.minSalary ) {
    sqlFilter.push(`"salary" >= $${idx}`);
    idx++
  }
  if ( search.hasEquity === true ) {
    search.hasEquity = 0;
    sqlFilter.push(`"equity" > $${idx}`);
    idx++
  }

  return {
    sqlFilter: sqlFilter.join(" AND "),
    values: Object.values(search),
  };
};

}

module.exports = Job;