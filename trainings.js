const express = require("express");
const debug = require("debug")("http");
const router = express.Router();
const connection = require("./connection");
const { v4: uuidv4 } = require("uuid");
const jwtCheck = require("./jwtCheck");
const throwErrAndRestart = require("./throwErrAndRestart");
const fns = require('date-fns')
const fnstz = require('date-fns-tz')
const localTimeZone = 'America/Los_Angeles'
const ymdFormat = 'yyyy-MM-dd';
const auth = require('./auth')
const now = fnstz.formatInTimeZone(new Date(), localTimeZone, 'yyyy-MM-dd HH:mm:ss'); 
router.route('/').post(auth, function (req, res) {
    const { trainings } = req.body;
    let values = [];
    if(!trainings || !Array.isArray(trainings) || trainings.length === 0) {
        throwErrAndRestart(res)
    }
    trainings.forEach(training => {
        training.eventDate = fnstz.formatInTimeZone(new Date(training.eventDate).getTime(), localTimeZone, 'yyyy-MM-dd HH:mm:ss');
        training.startTime =   fnstz.formatInTimeZone(training.startTime, localTimeZone, 'yyyy-MM-dd HH:mm:ss');
        training.endTime = fnstz.formatInTimeZone(training.endTime, localTimeZone, 'yyyy-MM-dd HH:mm:ss');
        values.push([
            training.description,
            training.location,
            training.eventDate,
            training.startTime,
            training.endTime,
            training.type,
            training.price,
            now
        ]);
    });
    console.log(values)


    const sql = `INSERT INTO trainings (
          description,
          location,
          eventDate,
          startTime,
          endTime,
          type,
          price,
          lastModified
          ) VALUES ?`;

    connection.query(sql, [values], function (err, results) {
        if (err) {
            throwErrAndRestart(res)
        } else {
            let id = results.insertId;
            let values = [];
            trainings.forEach(training => {
                training._id = id;
                training.dspStartTime = fnstz.formatInTimeZone(training.startTime, localTimeZone, 'hh:mm:a');
                training.dspEndTime = fnstz.formatInTimeZone(training.endTime, localTimeZone, 'hh:mm:a');
                values.push(training);
                id++;
            });
            res.status(200).json({
                status: 'success',
                data: values,
                message: 'Success'
            });
        }
    });
});

router.route('/private').get(auth, function (req, res) {
    const query = `select t.*, types.name as typeName, locations.name as locationName, rd.seriesId as rdSeriesId, rd._id as receiptDetailsId, rd.receiptId as receiptId, rd.attendeeList, rd.notes  
    from trainings t 
    inner  join types  
    on t.type = types.code 
    inner  join locations  
    on t.location = locations.code 
    left outer join receipt_details rd 
    on (t._id = rd.trainingId or 
    t._id in (select trainingId from seriesTrainings where seriesId = rd.seriesId)) 
    and (rd.isCanceled is null or rd.isCanceled = 0) 
    where t.eventDate >= Date(now()) 
    and t.type = 'PRIVATE' 
    and t.isDeleted is null 
    order by t.eventDate asc, t.startTime asc, t.type, t.description,rd.attendeeList`;
    connection.query(query, function (err, results) {
        if (err) {
            throwErrAndRestart(res);
        } else {
            res.status(200).json({
                status: 'success',
                data: results,
                message: 'Success'
            });
        }
    });
});
router.route('/upcoming').get(function (req, res) {
    const today = fnstz.formatInTimeZone(new Date(), localTimeZone, 'yyyy-MM-dd'); 
    const query = `select
                      distinct 
                      t._id,
                      t.description,
                      t.type,
                      t.location,
                      t.eventDate,
                      t.startTime,
                      t.endTime,
                      DATE_FORMAT(t.eventDate, "%a, %m/%d") as dspEventDate,
                      DATE_FORMAT(t.startTime, "%h:%i %p") as dspStartTime,
                      DATE_FORMAT(t.endTime, "%h:%i %p") as dspEndTime,
                      t.code,
                      t.price,
                      t.disableAddToCart,
                      a.seriesId,
                      t.isDeleted,
                      types.name as typeName, 
                      locations.name as locationName,
                      CONCAT(IFNULL(tr.attendeeList,'') , IFNULL(ts.attendeeList,'')) as attendeeList
              from trainings t   
              inner  join types    
              on t.type = types.code   
              inner  join locations    
              on t.location = locations.code   
              left outer join seriesTrainings a
              on t._id = a.trainingId
              left outer join receipt_details tr
              on t._id = tr.trainingId
              and tr.isCanceled is null
              left outer join receipt_details ts
              on a.seriesId = ts.seriesId
              and ts.isCanceled is null
              where t.eventDate >= '${today}'
              and t.isDeleted is null   
              order by t.eventDate asc, t.startTime asc, t.type, t.description
              `;
    connection.query(query, function (err, results) {
        if (err) {
            throwErrAndRestart(res);
        } else {
            res.status(200).json({
                status: 'success',
                data: results,
                message: 'Success'
            });
        }
    });
});
router.route('/code/:code').get(function (req, res) {
    const query =
        `select 
                  t.*, 
                  DATE_FORMAT(t.eventDate, "%a, %m/%d") as dspEventDate,
                  DATE_FORMAT(t.startTime, "%h:%i %p") as dspStartTime,
                  DATE_FORMAT(t.endTime, "%h:%i %p") as dspEndTime,
                  rd.seriesId as rdSeriesId, 
                  rd._id as receiptDetailsId, 
                  rd.receiptId as receiptId, 
                  rd.attendeeList, 
                  rd.notes 
                  from trainings t 
                  left outer join receipt_details rd 
                  on (t._id = rd.trainingId or 
                  t._id in (select trainingId from seriesTrainings where seriesId = rd.seriesId)) 
                  and (rd.isCanceled is null or rd.isCanceled = 0) 
                  where t.code=?
                  and t.isDeleted is null 
                  order by t.eventDate asc, t.startTime asc, t.type, t.description,rd.attendeeList`;
    connection.query(query, [req.params.code], function (err, results) {
        if (err) {
            throwErrAndRestart(res);
        } else {
            res.status(200).json({
                status: 'success',
                data: results,
                message: 'Success'
            });
        }
    });

});
router.route('/availableTrainingDates').get(function (req, res) {
    let { month, type } = req.query;
    month = fnstz.toDate(month, { timeZone: localTimeZone })
    const start = fns.format(fns.startOfMonth(month), ymdFormat);
    const end = fns.format(fns.lastDayOfMonth(month), ymdFormat);
    const today = fnstz.formatInTimeZone(new Date(), localTimeZone, 'yyyy-MM-dd'); 
    const typeList = (type || '').split(',').map(itemType => `"${itemType}"`).join(',');
    let query = ` select
          distinct
          DATE_FORMAT(t.eventDate, "%d") as eventDay
        from trainings t
        where t.isDeleted is null
        and t._id not in (select trainingId from receipt_details where isCanceled is null and 
        receipt_details.type IN ('SMALL_GROUP_TRAINING', 'SMALL_GROUP_TRAINING_90') and receipt_details.eventDate >= ? and receipt_details.eventDate <= ?)
        and t.eventDate >=  ? and t.eventDate <= ?
        and t.eventDate >= ?`;
    if (type) {
        query = `${query}
            and t.type in (${typeList})
          `;
    }
    query = `${query} and t.disableAddToCart is null`;
    connection.query(query, [start, end, start, end, today],
        function (err, result) {
            if (err) {
                throwErrAndRestart(res);
            } else {
                res.status(200).json({
                    status: 'success',
                    data: result,
                    message: 'Success'
                });
            }
        }
    );
});
router.route('/available').get(function (req, res) {
    const { type, selectedDate } = req.query;
    const typeList = (type || '').split(',').map(itemType => `"${itemType}"`).join(',');
    const today = fnstz.formatInTimeZone(new Date(), localTimeZone, 'yyyy-MM-dd'); 
    let query = `select
                distinct 
                t._id,
                t.description,
                t.type,
                t.location,
                t.eventDate,
                t.startTime,
                t.endTime,
                DATE_FORMAT(t.eventDate, "%a, %m/%d") as dspEventDate,
                DATE_FORMAT(t.startTime, "%h:%i %p") as dspStartTime,
                DATE_FORMAT(t.endTime, "%h:%i %p") as dspEndTime,
                t.code,
                t.price,
                t.disableAddToCart,
                a.seriesId,
                t.isDeleted,
                t._id as trainingId,
                types.name as typeName, 
                locations.name as locationName
        from trainings t   
        inner  join types    
        on t.type = types.code   
        inner  join locations    
        on t.location = locations.code   
        left outer join seriesTrainings a
        on t._id = a.trainingId
        left outer join receipt_details tr
        on t._id = tr.trainingId
        and tr.isCanceled is null
        left outer join receipt_details ts
        on a.seriesId = ts.seriesId
        and ts.isCanceled is null `;
    if (!selectedDate) {
        query = `${query} where t.eventDate >= '${today}'`;
    } else {
        const start = fnstz.toDate(selectedDate, { timeZone: localTimeZone })
        const end = fns.format(fns.addDays(new Date(start), 1), ymdFormat);
        query = `${query} where t.eventDate >= '${selectedDate}' and t.eventDate < '${end.toString().substring(0, 10)}'`;
    }
    if (type) {
        query = `${query}
            and t.type in (${typeList})
          `;
    }
    query = `${query}
        and t._id not in (select trainingId from receipt_details where isCanceled is null and receipt_details.type IN ('SMALL_GROUP_TRAINING', 'SMALL_GROUP_TRAINING_90') and receipt_details.eventDate >= '${today}' and trainingId is not null)
        and t.isDeleted is null   
        and t.disableAddToCart is null
        order by t.eventDate asc,  t.type, t.startTime asc,t.description
        `;

    connection.query(query,
        (err, result) => {
            if (err) {
                throwErrAndRestart(res)
            } else {
                res.status(200).json({
                    status: 'success',
                    data: result,
                    message: 'Success'
                });
            }
        }
    );
});
router.route('/all').get(function (req, res) {
    const query = `select
                  distinct 
                  t._id,
                  t.description,
                  t.type,
                  t.location,
                  t.eventDate,
                  t.startTime,
                  t.endTime,
                  t.disableAddToCart,
                  DATE_FORMAT(t.eventDate, "%a, %m/%d") as dspEventDate,
                  DATE_FORMAT(t.startTime, "%h:%i %p") as dspStartTime,
                  DATE_FORMAT(t.endTime, "%h:%i %p") as dspEndTime,
                  t.code,
                  t.price,
                  types.name as typeName, 
                  locations.name as locationName
          from trainings t   
          inner  join types    
          on t.type = types.code   
          inner  join locations    
          on t.location = locations.code   
          left outer join seriesTrainings a
          on t._id = a.trainingId
          where t.isDeleted is null   
          order by t.eventDate asc, t.startTime asc, t.type, t.description`;

    connection.query(query, function (err, trainings, fields) {
        if (err) {
            throwErrAndRestart(res)
        } else {
            res.status(200).json({
                status: 'success',
                data: trainings,
                message: 'Success'
            });
        }
    });
});

router.route('/month/:currentMonth').get(function (req, res) {
    const currentMonth = req.params.currentMonth;
    const query = `  select
                  distinct 
                  t._id,
                  t.description,
                  t.type,
                  t.location,
                  t.eventDate,
                  t.startTime,
                  t.endTime,
                  t.disableAddToCart,
                  DATE_FORMAT(t.eventDate, "%a, %m/%d") as dspEventDate,
                  DATE_FORMAT(t.startTime, "%h:%i %p") as dspStartTime,
                  DATE_FORMAT(t.endTime, "%h:%i %p") as dspEndTime,
                  t.code,
                  t.price,
                  a.seriesId,
                  types.name as typeName, 
                  locations.name as locationName
          from trainings t   
          inner  join types    
          on t.type = types.code   
          inner  join locations    
          on t.location = locations.code   
          left outer join seriesTrainings a
          on t._id = a.trainingId
          where t.isDeleted is null   
          and DATE_FORMAT(t.eventDate, "%Y-%m") = '${req.params.currentMonth}'
          order by t.eventDate asc, t.startTime asc, t.type, t.description`;
    connection.query(query, function (err, results, fields) {
        if (err) {
            throwErrAndRestart(res)
        } else {
            res.status(200).json({
                status: 'success',
                data: results,
                message: 'Success'
            });
        }
    });
});
router.route('/custom').get(function (req, res) {
    const today = fnstz.formatInTimeZone(new Date(), localTimeZone, 'yyyy-MM-dd'); 
    const { offset, type } = req.query;
    const typeList = (type || '').split(',').map(itemType => `"${itemType}"`).join(',');

    let query = `select
                distinct 
                t._id,
                a.seriesId,
                t.description,
                t.type,
                t.location,
                t.eventDate,
                t.startTime,
                t.endTime,
                t.disableAddToCart,
                DATE_FORMAT(t.eventDate, "%a, %m/%d") as dspEventDate,
                DATE_FORMAT(t.startTime, "%h:%i %p") as dspStartTime,
                DATE_FORMAT(t.endTime, "%h:%i %p") as dspEndTime,
                t.code,
                t.price,
                types.name as typeName, 
                locations.name as locationName,
                t.isDeleted,
                ts. attendeeList,
                ts.notes as notes,
                receipts.email,
                ts._id receiptDetailsId,
                ts.receiptId
            from trainings t   
            inner  join types    
            on t.type = types.code   
            inner  join locations    
            on t.location = locations.code   
            left outer join seriesTrainings a
            on t._id = a.trainingId
    
            left outer join receipt_details ts
            on a.seriesId = ts.seriesId
            and ts.isCanceled is null
    
            left outer join receipts 
            on ts.receiptId = receipts._id
    
            where t.isDeleted is null   
            and   t.eventDate >= '${today}'
            `;
    if (type) {
        query = `${query}
                and t.type in (${typeList})
              `;
    }
    query = ` ${query}
            union 
    
            select
                distinct 
                t._id,
                a.seriesId,
                t.description,
                t.type,
                t.location,
                t.eventDate,
                t.startTime,
                t.endTime,
                t.disableAddToCart,
                DATE_FORMAT(t.eventDate, "%a, %m/%d") as dspEventDate,
                DATE_FORMAT(t.startTime, "%h:%i %p") as dspStartTime,
                DATE_FORMAT(t.endTime, "%h:%i %p") as dspEndTime,
                t.code,
                t.price,
                types.name as typeName, 
                locations.name as locationName,
                t.isDeleted,
                IFNULL(tr.attendeeList,'') as attendeeList,
                tr.notes as notes,
                receipts.email,
                tr._id receiptDetailsId,
                tr.receiptId
                
            from trainings t   
            inner  join types    
            on t.type = types.code   
            inner  join locations    
            on t.location = locations.code   
            left outer join seriesTrainings a
            on t._id = a.trainingId
    
            left outer join receipt_details tr
            on t._id = tr.trainingId
            and tr.isCanceled is null
    
            left outer join receipts 
            on tr.receiptId = receipts._id
    
            where t.isDeleted is null   
            and   t.eventDate >= '${today}'`;
    if (type) {
        query = `${query}
                and t.type in (${typeList})
              `;
    }
    query = `${query} 
            order by eventDate, startTime asc, type, description
            LIMIT 100 OFFSET ${parseInt(offset, 10) || 0}`;

    connection.query(query, function (err, trainings, fields) {
        if (err) {
            throwErrAndRestart(res)
        } else {
            res.status(200).json({
                status: 'success',
                data: trainings,
                message: 'Success'
            });
        }
    });
});
router.route('/paidwithcode/').get(auth, function (req, res) {
    const query = `select
              distinct 
              tr.classPackCode,
              t._id,
              a.seriesId,
              t.description,
              t.type,
              t.location,
              t.eventDate,
              t.startTime,
              t.endTime,
              t.disableAddToCart,
              DATE_FORMAT(t.eventDate, "%a, %m/%d") as dspEventDate,
              DATE_FORMAT(t.startTime, "%h:%i %p") as dspStartTime,
              DATE_FORMAT(t.endTime, "%h:%i %p") as dspEndTime,
              t.code,
              t.price,
              types.name as typeName, 
              locations.name as locationName,
              t.isDeleted,
              IFNULL(tr.attendeeList,'') as attendeeList,
              tr.notes as notes,
              receipts.email,
              tr._id receiptDetailsId,
              tr.receiptId,
              receipts.last_name,
              receipts.first_name
              
          from trainings t   
          inner  join types    
          on t.type = types.code   
          inner  join locations    
          on t.location = locations.code   
          left outer join seriesTrainings a
          on t._id = a.trainingId
  
          left outer join receipt_details tr
          on t._id = tr.trainingId
          and tr.isCanceled is null
  
          left outer join receipts 
          on tr.receiptId = receipts._id
  
          where t.isDeleted is null   
          and tr.classPackCode is not null
          order by receipts.first_name, receipts.last_name`;

    connection.query(query, function (err, results, fields) {
        if (err) {
            throwErrAndRestart(res)
        } else {
            res.status(200).json({
                status: 'success',
                data: results,
                message: 'Success'
            });
        }
    });
});

router
    .route('/:id')
    .get(function (req, res) {
        var query =
            `select t.*,
                DATE_FORMAT(t.eventDate, "%a, %m/%d") as dspEventDate,
                DATE_FORMAT(t.startTime, "%h:%i %p") as dspStartTime,
                DATE_FORMAT(t.endTime, "%h:%i %p") as dspEndTime,
                types.name as typeName, 
                locations.name as locationName 
                from trainings t 
    left outer join types  on t.type = types.code 
    left outer join locations on t.location = locations.code 
    where _id = ` +
            mysql.escape(req.params.id) +
            `
    order by t.eventDate desc `;

        connection.query(query, function (err, result, fields) {
            if (err) {
                throwErrAndRestart(res)
            } else {
                res.status(200).json({
                    status: 'success',
                    data: result,
                    message: 'Success'
                });
            }
        });
    })
    .post(auth, function (req, res) {
        var body = req.body;
        var singleTraining = {
            location: body.location, //array? training in multiple locations?
            description: body.description,
            eventDate: new Date(body.eventDate),
            startTime: new Date(body.startTime),
            endTime: new Date(body.endTime),
            type: body.type,
            price: body.price,
            isDeleted: body.isDeleted,
            code: body.code
        };

        var condition = { _id: body._id };

        connection.query(
            'UPDATE trainings SET ? WHERE ?',
            [singleTraining, condition],
            function (err, result, fields) {
                singleTraining._id = condition._id;
                if (moment(singleTraining.startTime).isDST()) {
                    singleTraining.dspStartTime = moment(singleTraining.startTime)
                        .add(-1, 'h')
                        .format('hh:mm A');
                    singleTraining.dspEndTime = moment(singleTraining.endTime)
                        .add(-1, 'h')
                        .format('hh:mm A');
                } else {
                    singleTraining.dspStartTime = moment(singleTraining.startTime).format(
                        'hh:mm A'
                    );
                    singleTraining.dspEndTime = moment(singleTraining.endTime).format(
                        'hh:mm A'
                    );
                }
                if (err) {
                    throwErrAndRestart(res)
                } else {
                    res.status(200).json({
                        status: 'success',
                        data: singleTraining,
                        message: 'Success'
                    });
                }
            }
        );
    });

module.exports = router;
