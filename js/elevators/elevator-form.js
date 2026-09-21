export function readElevatorForm(form){const data=Object.fromEntries(new FormData(form).entries());delete data.elevatorCode;return data;}
