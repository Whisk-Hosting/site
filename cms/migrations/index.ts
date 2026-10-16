import * as migration_20261010_150635_initial from './20261010_150635_initial';
import * as migration_20261010_175354_search_title_and_site_name from './20261010_175354_search_title_and_site_name';
import * as migration_20261010_195919_upload_fields_everywhere from './20261010_195919_upload_fields_everywhere';
import * as migration_20261013_062340_edited_by from './20261013_062340_edited_by';
import * as migration_20261015_041708_pages_per_market from './20261015_041708_pages_per_market';
import * as migration_20261016_013641_search_details from './20261016_013641_search_details';

export const migrations = [
  {
    up: migration_20261010_150635_initial.up,
    down: migration_20261010_150635_initial.down,
    name: '20261010_150635_initial',
  },
  {
    up: migration_20261010_175354_search_title_and_site_name.up,
    down: migration_20261010_175354_search_title_and_site_name.down,
    name: '20261010_175354_search_title_and_site_name',
  },
  {
    up: migration_20261010_195919_upload_fields_everywhere.up,
    down: migration_20261010_195919_upload_fields_everywhere.down,
    name: '20261010_195919_upload_fields_everywhere',
  },
  {
    up: migration_20261013_062340_edited_by.up,
    down: migration_20261013_062340_edited_by.down,
    name: '20261013_062340_edited_by',
  },
  {
    up: migration_20261015_041708_pages_per_market.up,
    down: migration_20261015_041708_pages_per_market.down,
    name: '20261015_041708_pages_per_market',
  },
  {
    up: migration_20261016_013641_search_details.up,
    down: migration_20261016_013641_search_details.down,
    name: '20261016_013641_search_details'
  },
];
