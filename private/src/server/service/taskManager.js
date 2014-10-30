/**
 * TODO task give task statistics
 * TODO give clients statistics
 */
module.exports = function taskManagerService(config, log, dispatcher, workersService, defer, promise, _) {

    return {
        init: init,
        addTask: addTask,
        getWorkers: workersService.get
    };

    // public methods
    function init() {
        dispatcher.start();
    }

    function addTask(task, taskConfig) {
        taskConfig = taskConfig || '';
        var deferred = defer(),
            todos = [];

        dispatcher.addTask(task, deferred);

        if (!taskConfig.times) {
            return deferred.promise;
        }

        _.times(taskConfig.times, function (n) {
            deferred = defer();
            dispatcher.addTask(task, deferred);
            todos.push(deferred.promise);
        });

        return promise
            .settle(todos)
            .then(filterFullFilled)
            .then(checkMajority);
    }

    function filterFullFilled(promises) {
        return promises
            .filter(function (promise) {
                return promise.isFulfilled();        //  can be also isRejected()
            })
            .map(function (promise) {
                return promise.value();
            });
    }

    function first2MostCommon(arr) {
        return _(arr)
            .groupBy()
            .sortBy(function (el) {
                return -el.length;
            })
            .map(_.first)
            .first(2)
            .value();
    }

    function compare2Answers(data) {
        if (_.isEqual(data[0], data[1])) {
            return data[0];
        } else {
            throw new Error('Clients calculated different things, ' +
                'some may even could not finish calculations');
        }
    }

    // maybe would be better to send calculations to arbiter
    //:: array[data] -> array
    function checkMajority(data) {
        var requiredOK = parseInt(data.length / 2 + 1);
        if (2 === requiredOK) {
            return compare2Answers(data);
        }
        return first2MostCommon(data);
    }
};
