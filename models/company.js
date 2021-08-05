"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
        `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
        `INSERT INTO companies(
          handle,
          name,
          description,
          num_employees,
          logo_url)
           VALUES
             ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /** Find all companies.
   *
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

  static async findAll() {
    const companiesRes = await db.query(
        `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM companies
           ORDER BY name`);
    return companiesRes.rows;
  }

  /** Find companies by filter.
   * 
   * Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   * */

   static async findFilter(search) {
    const { sqlFilter , values } = Company.sqlForCompanyFilter(search);
    const querySQL =`
      SELECT handle,
              name,
              description,
              num_employees AS "numEmployees",
              logo_url AS "logoUrl"
      FROM companies
      WHERE ${sqlFilter}
    `
    const filteredCompaniesRes = await db.query(querySQL , [...values]);
    return filteredCompaniesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
        `SELECT handle,
                name,
                description,
                num_employees AS "numEmployees",
                logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
      UPDATE companies
      SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
        `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }

  /******************************** HELPER FUNCTIONS *********************************/

/**
 * search is request body that may include fields to filter by
 * ex. {"minEmployees" : 100, "maxEmployees": 1000}
 * 
 * returns SQL WHERE conditions and array of data to fill in conditions
 * { setCols :'"numEmployees >= $1 AND numEmployees <= $2',
 * values: [100, 1000] }
 */
  static sqlForCompanyFilter(search) {
    const keys = Object.keys(search);

    const valid_keys = new Set(['name', 'minEmployees', 'maxEmployees']);
    keys.forEach(function(key) {
      if (!(valid_keys.has(key))) {
        throw new BadRequestError("Invalid filter");
      } 
    }); 

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
  };
}




module.exports = Company;
