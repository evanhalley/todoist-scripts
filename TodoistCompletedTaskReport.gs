var COMPLETED_TASKS_ENDPOINT = 'https://api.todoist.com/sync/v8/completed/get_all?since=[SINCE]&until=[UNTIL]';
var EMAIL_SUBJECT = 'Todoist Completed Tasks Report for [DATE]';
var MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

function main() {
  var yesterday = getYesterday();
  var tasks = getCompletedTasks(yesterday);
  
  if (tasks) {
    processCompletedTasks(tasks, yesterday);
  } else {
    Logger.log('There are no completed tasks to process');
  }
}

function getCompletedTasks(date) {
  var tasks = null;
  var since = Utilities.formatDate(date, 'Etc/GMT', 'yyyy-MM-dd\'T00:00\'');
  var until = Utilities.formatDate(date, 'Etc/GMT', 'yyyy-MM-dd\'T23:59\'');
  var params = { 
    method: 'POST',
    payload: 'token=' + PropertiesService.getScriptProperties().getProperty('todoist_token') 
  };
  var url = COMPLETED_TASKS_ENDPOINT.replace('[SINCE]', since).replace('[UNTIL]', until);
  Logger.log('Sending request: ' + url);
  var response = UrlFetchApp.fetch(url, params);
  
  if (response.getResponseCode() == 200) {
    tasks = JSON.parse(response.getContentText());
  } else {
    Logger.log("Error communication with Todoist. Response code: " + response.getResponseCode()); 
  }
  return tasks;
}

function processCompletedTasks(tasks, date) {
  var projectTasks = new Array();
  var numberOfTasksCompleted = tasks.items.length;
  
  // build a project to tasks map
  for (var i in tasks.items) {
    var item = tasks.items[i];
    var projectName = tasks.projects[item.project_id].name;
    
    if (!projectTasks[projectName]) {
      projectTasks[projectName] = new Array();
    }
    projectTasks[projectName].push(item.content);
  }
  
  // build the body of the email
  var body = 'You completed <u>[COUNT]</u> tasks. <br/><br/>'.replace('[COUNT]', numberOfTasksCompleted);
  for (var projectName in projectTasks) {
    var tasks = projectTasks[projectName];
    var taskBody = 'For <b>' + projectName + ':</b><br/>';
    
    for (var i in tasks) {
      taskBody += ' - ' + tasks[i] + '<br/>';
    }
    taskBody += '<br/>';
    body += taskBody;
  }
  var dateForSubject = Utilities.formatDate(date, 'Etc/GMT', 'MM-dd-yyyy');
  GmailApp.sendEmail(Session.getActiveUser().getEmail(), EMAIL_SUBJECT.replace('[DATE]', dateForSubject), body, { htmlBody: body });
}

function getYesterday() {
  var now = new Date();
  return new Date(now.getTime() - MILLIS_PER_DAY);
}
