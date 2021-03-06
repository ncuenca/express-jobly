"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");
const { sqlForPartialUpdate } = require("../helpers/sql");
const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../expressError");

const { BCRYPT_WORK_FACTOR } = require("../config.js");
const { application } = require("express");

/** Related functions for users. */

class User {
  /** authenticate user with username, password.
   *
   * Returns { username, first_name, last_name, email, is_admin }
   *
   * Throws UnauthorizedError is user not found or wrong password.
   **/

  static async authenticate(username, password) {
    // try to find the user first
    const result = await db.query(
          `SELECT username,
                  password,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
        [username],
    );

    const user = result.rows[0];

    if (user) {
      // compare hashed password to a new hash from password
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid === true) {
        delete user.password;
        return user;
      }
    }

    throw new UnauthorizedError("Invalid username/password");
  }

  /** Register user with data.
   *
   * Returns { username, firstName, lastName, email, isAdmin }
   *
   * Throws BadRequestError on duplicates.
   **/

  static async register(
      { username, password, firstName, lastName, email, isAdmin }) {
    const duplicateCheck = await db.query(
          `SELECT username
           FROM users
           WHERE username = $1`,
        [username],
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate username: ${username}`);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
          `INSERT INTO users
           (username,
            password,
            first_name,
            last_name,
            email,
            is_admin)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING username, first_name AS "firstName", last_name AS "lastName", email, is_admin AS "isAdmin"`,
        [
          username,
          hashedPassword,
          firstName,
          lastName,
          email,
          isAdmin,
        ],
    );

    const user = result.rows[0];

    return user;
  }

  /** Find all users.
   *
   * Returns [{ username, first_name, last_name, email, is_admin, jobs}, ...]
   *    jobs is [job_id, job_id, job_id]
   **/

  static async findAll() {

    // const result = await db.query(
    //   `SELECT users.username,
    //           job_id as "jobId"
    //    FROM applications
    //    ON users.username = applications.username
    //    GROUP BY users.username, job_id
    //    ORDER BY users.username`,
    // );

    // const result = await db.query(
    //   `SELECT users.username,
    //           first_name AS "firstName",
    //           last_name AS "lastName",
    //           email,
    //           is_admin AS "isAdmin",
    //           job_id as "jobId"
    //    FROM users
    //    JOIN applications
    //    ON users.username = applications.username
    //    GROUP BY users.username, job_id
    //    ORDER BY users.username`,
    // );
    // console.log(result);
    // const usernames = [];
    // const userInfos = [];
    // let userJobs;
    // for (let user of result.rows) {
    //   if (!(usernames.has(user.username))) {
    //     userJobs = [];
    //     usernames.push(user.username);
    //     userJobs.push(user.jobId);
    //   } else {
    //     userJobs.push(user.jobId);
    //   }
    // }
    // WORKING
    // const result = await db.query(
    //       `SELECT username,
    //               first_name AS "firstName",
    //               last_name AS "lastName",
    //               email,
    //               is_admin AS "isAdmin"
    //        FROM users
    //        ORDER BY username`,
    // );

    // const jobApplication = await db.query(
    //   `SELECT job_id
    //   FROM applications
    //   JOIN users 
    //   ON users.username = applications.username
    //   ORDER BY users.username
    //   `

    // )

    const userRes = await db.query(
          `SELECT username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           ORDER BY username`,
    );
    const users = userRes.rows;

    const appsRes = await db.query(
      `SELECT username, job_id
      FROM applications
      ORDER BY username
      `
    );
    const manyApps = appsRes.rows;
    
    let uniqueApps = {}

    for(let app of manyApps){
      if (uniqueApps[app.username]){
        uniqueApps[app.username].push(app.job_id)
      }
      else{
        uniqueApps[app.username] = [app.job_id]
      }
    }

    for( let user of users){
      if (uniqueApps[user.username]){
        user.job = uniqueApps[user.username];
      }else{
        user.job =[];
      }
    }
    
    return users;
  }

  /** Given a username, return data about user.
   *
   * Returns { username, first_name, last_name, is_admin, jobs }
   *   where jobs is [job_id, job_id, ...]
   *
   * Throws NotFoundError if user not found.
   **/

  static async get(username) {
    const userRes = await db.query(
          `SELECT username,
                  first_name AS "firstName",
                  last_name AS "lastName",
                  email,
                  is_admin AS "isAdmin"
           FROM users
           WHERE username = $1`,
        [username],
    );
    const user = userRes.rows[0];

    const appRes = await db.query(
      `SELECT job_id
      FROM applications
      WHERE username = $1
      `,[username]
    )
    const appIds = appRes.rows

    if (!user) throw new NotFoundError(`No user: ${username}`);

    return [user, appIds];
  }

  /** Update user data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain
   * all the fields; this only changes provided ones.
   *
   * Data can include:
   *   { firstName, lastName, password, email, isAdmin }
   *
   * Returns { username, firstName, lastName, email, isAdmin }
   *
   * Throws NotFoundError if not found.
   *
   * WARNING: this function can set a new password or make a user an admin.
   * Callers of this function must be certain they have validated inputs to this
   * or a serious security risks are opened.
   */

  static async update(username, data) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, BCRYPT_WORK_FACTOR);
    }

    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          firstName: "first_name",
          lastName: "last_name",
          isAdmin: "is_admin",
        });
    const usernameVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE users 
                      SET ${setCols} 
                      WHERE username = ${usernameVarIdx} 
                      RETURNING username,
                                first_name AS "firstName",
                                last_name AS "lastName",
                                email,
                                is_admin AS "isAdmin"`;
    const result = await db.query(querySql, [...values, username]);
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`No user: ${username}`);

    delete user.password;
    return user;
  }

  /** Delete given user from database; returns undefined. */

  static async remove(username) {
    let result = await db.query(
          `DELETE
           FROM users
           WHERE username = $1
           RETURNING username`,
        [username],
    );
    const user = result.rows[0];
    if (!user) throw new NotFoundError(`No user: ${username}`);
  }

  /** Add job to user's applications; returns job_id */

  static async apply(username, jobId){

    let result = await db.query(
      `INSERT INTO applications
      (username, job_id)
      VALUES ($1 , $2)
      RETURNING job_id      
      `,[username, jobId]
    )
    const application = result.rows[0];
    if (!application) throw new NotFoundError(`Can not apply to this job with id of ${application}`);
    console.log("THIS IS APPLICATION ----------------- ", application);
    return application.job_id;
  }
}


module.exports = User;
