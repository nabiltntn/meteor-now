import spawnProcess from './process';
import { getEnvironmentVariable, getEnvironmentVariables } from './args';
import { getMeteorSettings } from './meteor';
import { meteorNowBuildPath, projectName, ignoreVarsArray } from './constants';
import logger from './logger';

// get all variables except for MONGO_URL, ROOT_URL, METEOR_SETTINGS and PORT
// this is in case user passed additional environment variables to their app
// those would be passed down to the now cli command
export const getRemainingVariables = (environmentVariables) => {
  if (!environmentVariables) {
    return [];
  }
  // filter our vars we already handled and return an array
  // where first value is the flag -e and second is the ENV=VALUE
  return environmentVariables
    .filter(v => ignoreVarsArray.indexOf(v.name) === -1)
    .map(v => ['-e', `${v.name}=${v.value}`]);
};

// construct an array of options to be passed to the now command
export const constructNowOptions = async () => {
  // get list of all environment variables user passed with the -e flag
  const environmentVariables = await getEnvironmentVariables();
  // construct the ROOT_URL variable
  const rootUrl =
    getEnvironmentVariable('ROOT_URL', environmentVariables) || 'http://localhost.com';
  // construct the MONGO_URL variable
  const mongoUrl =
    getEnvironmentVariable('MONGO_URL', environmentVariables) || 'mongodb://127.0.0.1:27017';

  const remainingOptions = getRemainingVariables(environmentVariables);

  // options passed to the now cli tool. This array will be flattened
  // and will eventually be a string seperated by spaces.
  const options = [
    meteorNowBuildPath,
    ['--name', projectName],
    ['-e', 'PORT=3000'],
    ['-e', `ROOT_URL=${rootUrl}`],
    ['-e', `MONGO_URL=${mongoUrl}`],
    ...remainingOptions,
  ];

  // construct the METEOR_SETTINGS, first by checking if user passed
  // -e METEOR_SETTINGS='{ "foo": "bar" }' option to meteor-now
  let meteorSettings = getEnvironmentVariable('METEOR_SETTINGS', environmentVariables);
  // if not, check if still no METEOR_SETTINGS exist
  if (!meteorSettings) {
    // check if NODE_ENV is passed and look for production.settings.json file
    meteorSettings = await getMeteorSettings();
  }
  if (meteorSettings) {
    options.push(['-e', `METEOR_SETTINGS='${meteorSettings}'`]);
  }

  return options;
};

// deploy app with correct options
export const deploy = async () => {
  logger('deploying app');
  const nowOptions = await constructNowOptions();
  // spawn child process to execute now command. Flatten nowOptions
  // in order to properly pass all the options to now
  // eslint-disable-next-line
  await spawnProcess('now', [].concat.apply([], nowOptions));
};
