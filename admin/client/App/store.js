import { createStore, combineReducers, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import { browserHistory } from 'react-router';
import { routerReducer, routerMiddleware, push, replace } from 'react-router-redux';

import ListsReducer from './screens/List/reducers/main';
import ActiveReducer from './screens/List/reducers/active';

import { loadItems } from './screens/List/actions';

const reducers = combineReducers({
	lists: ListsReducer,
	active: ActiveReducer,
	routing: routerReducer,
});

const store = createStore(
	reducers,
	applyMiddleware(
		thunk,
		routerMiddleware(browserHistory)
	)
);

// Sync the state to the URL parameters. The parameters are:
// - columns: column1,column2,...
// - search: somestring
// - sort: -somestring
// - page: 3
let cachedColumns = '';
let cachedSearch = '';
let cachedSort = '';
let cachedPage = 0;
store.subscribe(() => {
	// Get all the necessary data
	const state = store.getState();
	const list = state.lists.currentList;
	const items = state.lists.items;
	// If we aren't on a list, or haven't loaded any items yet don't do anything
	if (!list || items.count < 1) return;
	const search = state.active.search;
	const location = state.routing.locationBeforeTransitions;

	let columns = state.active.columns;
	let sort = state.active.sort.rawInput;
	let page = state.lists.page.index;

	if (columns) {
		columns = columns.map((column) => column.path);
	}

	// Column handling
	if (Array.isArray(columns)) columns = columns.join(',');
	if (columns === list.defaultColumnPaths) columns = undefined;

	// TODO: Starting or clearing a search pushes a new history state, but updating
	// the current search replaces it for nicer history navigation support

	// Sorting
	if (sort === list.defaultSort) sort = undefined;

	// Pagination
	if (page === 1) page = undefined;

	// If at least one value is different from the cached value, change the query
	// parameter
	// This check is important because updateQueryParams dispatches an action
	// so this would be an endless loop if we didn't check this
	if ((page !== cachedPage)
			|| (columns !== cachedColumns)
			|| (sort !== cachedSort)
			|| (search !== cachedSearch)) {
		// Cache the new values
		cachedPage = page;
		cachedColumns = columns;
		cachedSort = sort;
		cachedSearch = search;
		// Update the query params
		updateQueryParams({
			page,
			columns,
			sort,
			search,
		}, false, location);
		// After we've updated the query params, load the new items
		store.dispatch(loadItems());
	}
});

function updateQueryParams (params, shouldReplace, location) {
	if (!location) return;
	const newParams = Object.assign({}, location.query);
	Object.keys(params).forEach(i => {
		if (params[i]) {
			newParams[i] = params[i];
			if (typeof newParams[i] === 'object') {
				newParams[i] = JSON.stringify(newParams[i]);
			}
		} else {
			delete newParams[i];
		}
	});
	if (shouldReplace) {
		store.dispatch(replace({
			pathname: location.pathname,
			query: newParams,
		}));
	} else {
		store.dispatch(push({
			pathname: location.pathname,
			query: newParams,
		}));
	}
}

export default store;
