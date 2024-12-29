import React, {useEffect} from "react";

function GoogleMap(props) {
    useEffect(() => {
        const ifameData = document.getElementById("iframeId")
        const lat = props.latitude;
        const lon = props.longitude;
        ifameData.src = `https://maps.google.com/maps?q=${lat},${lon}&hl=es;&output=embed`
    })
    return (
        <div>
            <iframe id="iframeId" height="350px" width="100%"></iframe>
        </div>
    );
}

export default GoogleMap;