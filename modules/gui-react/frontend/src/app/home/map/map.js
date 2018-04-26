import actionBuilder from 'action-builder'
import earthengine from 'earthengine-api'
import GoogleMapsLoader from 'google-maps'
import Http from 'http-client'
import PropTypes from 'prop-types'
import React from 'react'
import Rx from 'rxjs'
import {connect, select} from 'store'
import './map.module.css'

export let map = null
const ee = earthengine.ee
let google = null
let drawingManager = null

export const initGoogleMapsApi$ = () => {
    const loadGoogleMapsApiKey$ =
        Http.get$('/api/data/google-maps-api-key')
            .map((e) => e.response.apiKey)

    const loadGoogleMapsApi$ = (apiKey) => Rx.Observable.create((observer) => {
        GoogleMapsLoader.KEY = apiKey
        GoogleMapsLoader.LIBRARIES = ['drawing']
        GoogleMapsLoader.load((g) => {
            google = g
            observer.next(apiKey)
            observer.complete()
        })
    })

    return loadGoogleMapsApiKey$
        .mergeMap(loadGoogleMapsApi$)
        .map((apiKey) => actionBuilder('SET_GOOGLE_MAPS_API_INITIALIZED', {apiKey: apiKey})
            .set('map.apiKey', apiKey)
            .build()
        )
}

const createMap = (mapElement) => {
    const instance = new google.maps.Map(mapElement, {
        zoom: 3,
        minZoom: 3,
        maxZoom: 15,
        center: new google.maps.LatLng(16.7794913, 9.6771556),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        zoomControl: false,
        mapTypeControl: false,
        scaleControl: false,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: false,
        backgroundColor: '#131314',
        gestureHandling: 'greedy',
        styles: defaultStyle
    })
    instance.addListener('zoom_changed', () =>
        actionBuilder('SET_MAP_ZOOM')
            .set('map.zoom', instance.getZoom())
            .dispatch()
    )
    var drawingOptions = {
        fillColor: '#FBFAF2',
        fillOpacity: 0.07,
        strokeColor: '#c5b397',
        strokeOpacity: 1,
        strokeWeight: 2,
        clickable: false,
        editable: false,
        zIndex: 1
    }

    drawingManager = new google.maps.drawing.DrawingManager({
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        drawingControl: false,
        drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            // drawingModes: [ 'marker', 'circle', 'polygon', 'polyline', 'rectangle' ]
            drawingModes: ['polygon']
        },
        circleOptions: drawingOptions
        , polygonOptions: drawingOptions
        , rectangleOptions: drawingOptions
    })

    const addLayer = (layer) => {
        instance.overlayMapTypes.push(layer)
    }

    const removeLayer = (name) => {
        let index = instance.overlayMapTypes.getArray().findIndex(x => x.name === name)
        instance.overlayMapTypes.removeAt(index)
    }

    map = {
        getZoom() {
            return instance.getZoom()
        },
        zoomIn() {
            instance.setZoom(instance.getZoom() + 1)
        },
        zoomOut() {
            instance.setZoom(instance.getZoom() - 1)
        },
        isMaxZoom() {
            return instance.getZoom() === instance.maxZoom
        },
        isMinZoom() {
            return instance.getZoom() === instance.minZoom
        },
        addGEELayer(mapId, token) {
            let geeLayer = new ee.MapLayerOverlay('https://earthengine.googleapis.com/map', mapId, token, {name: 'gee'})
            instance.overlayMapTypes.push(geeLayer)
        },
        showLabelsLayer(shown) {
            if (shown)
                addLayer(
                    new google.maps.StyledMapType(labelsLayerStyle, {name: 'labels'})
                )
            else
                removeLayer('labels')
        },
        enableDrawingMode(callback) {
            google.maps.event.addListener(drawingManager, 'overlaycomplete', function (e) {
                let path = e.overlay.getPaths().getArray()[0].getArray().map((latLng) => [latLng.lng(), latLng.lat()])
                callback(path)
            })
            drawingManager.setMap(instance)
        },
        disableDrawingMode() {
            drawingManager.setMap(null)
        }
    }
}

// https://developers.google.com/maps/documentation/javascript/style-reference
const defaultStyle = [
    {stylers: [{visibility: 'simplified'}]},
    {stylers: [{color: '#131314'}]},
    {featureType: 'water', stylers: [{color: '#131313'}, {lightness: 4}]},
    {elementType: 'labels.text.fill', stylers: [{visibility: 'off'}, {lightness: 25}]}
]

const labelsLayerStyle = [
    {featureType: 'all', stylers: [{visibility: 'off'}]},
    {featureType: 'road', elementType: 'geometry', stylers: [{visibility: 'on'}]},
    {elementType: 'labels.text.fill', stylers: [{visibility: 'on'}]},
]

const mapStateToProps = () => ({
    apiKey: select('map.apiKey')
})


class Map extends React.Component {
    state = {initialized: false}
    mapElement = React.createRef()

    render() {
        return <div ref={this.mapElement} className={this.props.className}/>
    }

    componentDidUpdate() {
        const apiKey = this.props.apiKey
        if (apiKey && !this.state.initialized) { // Create map once there is an API key
            this.setState((prevState) => ({...prevState, initialized: true}))
            createMap(this.mapElement.current)
            this.initialized = true
        }
    }
}

Map.propTypes = {
    className: PropTypes.string
}

export default connect(mapStateToProps)(Map)