request_indexer: FL_PATHS=request node ./app.js
response_indexer: FL_PATHS=response node ./app.js
error_indexer: FL_PATHS=error node ./app.js
guest_indexer: FL_PATHS=guest node --max_old_space_size=3000 ./app.js
search: FL_SEARCH=true node ./app.js
