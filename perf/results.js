function median(values) {
    if (values.length === 0) 
        return 0;
    


    values.sort(function (a, b) {
        return a - b;
    });

    var half = Math.floor(values.length / 2);

    if (values.length % 2) 
        return values[half];
    


    return(values[half - 1] + values[half]) / 2.0;
}

async function results(library, db) {
    const results = [];
    await db.runs.each(r => results.push(r.duration));
    const sum = results.reduce(function (acc, item) {
        acc = acc + item;
        return acc;
    }, 0);

    const mid = median(results)
    console.log(`${library} averages ${
        Math.round(sum / results.length)
    } ms in ${
        results.length
    } runs with a median of ${
        Math.round(mid)
    } ms`);
}
