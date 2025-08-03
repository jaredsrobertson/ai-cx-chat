// This function recursively converts a Dialogflow Struct object into a plain JavaScript object.
export function parseDialogflowResponse(fields) {
  if (!fields) return null;
  const result = {};
  for (const key in fields) {
    const value = fields[key];
    const valueType = Object.keys(value)[0];
    switch (valueType) {
      case 'stringValue':
      case 'numberValue':
      case 'boolValue':
        result[key] = value[valueType];
        break;
      case 'structValue':
        result[key] = parseDialogflowResponse(value.structValue.fields);
        break;
      case 'listValue':
        result[key] = value.listValue.values.map(item =>
          item.structValue ? parseDialogflowResponse(item.structValue.fields) : item[Object.keys(item)[0]]
        );
        break;
      default:
        result[key] = null;
        break;
    }
  }
  return result;
}