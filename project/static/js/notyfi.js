function showNotify(type, text) {
    if (!type || !text) {
        console.log("Không có type hoặc text");
        return;
    }else{
        switch (type) {
            case "success":
                $.notify(text, {type:'success', icon:'check-circle', align:'right', verticalAlign:'top', delay:3000});
                break;
            case "error":
                $.notify(text, {type:'danger', icon:'exclamation-circle', align:'right', verticalAlign:'top', delay:3000});
                break;
            case "warning":
                $.notify(text, {type:'warning', icon:'exclamation-circle', align:'right', verticalAlign:'top', delay:3000});
                break;
            case "toast":
                $.notify(text, {type:'toast', icon:'info-circle', align:'right', verticalAlign:'top', delay:3000});
                break;
            case "info":
                $.notify(text, {type:'info', icon:'info-circle', align:'right', verticalAlign:'top', delay:3000});
                break;
            default:
                $.notify(text, {type:'default', icon:'info-circle', align:'right', verticalAlign:'top', delay:3000});
                break;
        }
    }
}