exports.menu = {
    "contents":[
        { "type": "paragraph", "text": "Welcome to the Hello World driver. Enter some text to echo back."},
        { "type": "input_field_text", "field_name": "hello_text", "value": "", "label": "Some Text", "placeholder": "Hellooooo!", "required": true},
        { "type": "submit", "name": "Echo back to me", "rpc_method": "echo" },
    ]
};

exports.echo = {
    "contents":[
        { "type": "paragraph", "text": "You said"},
    ]
};

exports.menu = {
    "contents":[
        { "type": "paragraph", "text":"Please enter the details of the LimitlessLED bridge"},
        { "type": "input_field_text", "field_name": "lllw_ip_address", "value": "10.0.0.44", "label": "LimitlessLED bridge IP Address", "placeholder": "192.168.1.100", "required": true},
        { "type": "input_field_text", "field_name": "lllw_port", "value": "50000", "label": "LimitlessLED Hub Port", "placeholder": "50000", "required": true},
        { "type": "input_field_select", "field_name": "lllw_group", "label": "Group", "options": [{"name": "1", "value": 1, "selected": true}, {"name":"2", "value":2, selected:false}, {"name":"3", "value":3, selected:false}, {"name":"4", "value":4, selected:false}], "required": true },
        { "type": "submit", "name": "Save", "rpc_method": "config" }
//        { "type": "close", "text": "Cancel" }
    ]
};

exports.finish = {
    "finish": true
};