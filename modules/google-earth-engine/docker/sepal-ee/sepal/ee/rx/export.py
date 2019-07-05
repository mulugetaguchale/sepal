import ee
from rx import concat, of
from rx.operators import do_action, flat_map
from sepal.rx.retry import retry_with_backoff
from sepal.rx.workqueue import WorkQueue

from .asset import delete_asset
from .task import execute_task

# Work (i.e. exports) is grouped by credentials, limiting concurrent exports per credentials
_ee_exports = WorkQueue(
    concurrency_per_group=2,
    description='ee_exports'
)


def export_image_to_asset(
        image, description=None, asset_id=None, pyramiding_policy=None, dimensions=None, region=None,
        scale=None, crs=None, crs_transform=None, max_pixels=None, retries=0
):
    asset_id, description = _init_asset_id_and_description(asset_id, description)
    return _export_to_asset(
        to_task=lambda: ee.batch.Export.image.toAsset(
            image=image,
            description=description,
            assetId=asset_id,
            pyramidingPolicy=pyramiding_policy,
            dimensions=dimensions,
            region=region,
            scale=scale,
            crs=crs,
            crsTransform=crs_transform,
            maxPixels=max_pixels
        ),
        asset_id=asset_id,
        task_description='export_image_to_asset(asset_id={}, description={}'.format(asset_id, description),
        retries=retries
    )


def export_table_to_asset(
        collection, description=None, asset_id=None, retries=3
):
    asset_id, description = _init_asset_id_and_description(asset_id, description)
    return _export_to_asset(
        to_task=lambda: ee.batch.Export.table.toAsset(
            collection=collection,
            description=description,
            assetId=asset_id
        ),
        asset_id=asset_id,
        task_description='export_table_to_asset(asset_id={}, description={}'.format(asset_id, description),
        retries=retries
    )


def export_image_to_drive(
        image, description, folder=None, file_name_prefix=None, dimensions=None, region=None,
        scale=None, crs=None, crs_transform=None, max_pixels=None, shard_size=None, file_dimensions=None,
        skip_empty_tiles=None, file_format=None, format_options=None, retries=0
):
    return _export_to_drive(
        to_task=lambda: ee.batch.Export.image.toDrive(
            image=image,
            description=description,
            fileNamePrefix=file_name_prefix,
            dimensions=dimensions,
            region=region,
            scale=scale,
            crs=crs,
            crsTransform=crs_transform,
            maxPixels=max_pixels,
            shardSize=shard_size,
            fileDimensions=file_dimensions,
            skipEmptyTiles=skip_empty_tiles,
            fileFormat=file_format,
            formatOptions=format_options
        ),
        task_description='export_table_to_drive(description={}, folder={}, fileNamePrefix={}'.format(
            description, folder, file_name_prefix
        ),
        retries=retries
    )


def export_table_to_drive(
        collection, description=None, folder=None, file_name_prefix=None, file_format=None, selectors=None, retries=3
):
    return _export_to_drive(
        to_task=lambda: ee.batch.Export.table.toDrive(
            collection=collection,
            description=description,
            folder=folder,
            fileNamePrefix=file_name_prefix,
            fileFormat=file_format,
            selectors=selectors
        ),
        task_description='export_table_to_drive(description={}, folder={}, fileNamePrefix={}'.format(
            description, folder, file_name_prefix
        ),
        retries=retries
    )


def _init_asset_id_and_description(asset_id, description):
    if asset_id and not description:
        i = asset_id.rfind('/')
        description = asset_id[i + 1:]
    elif description and not asset_id:
        asset_id = '{}/{}'.format(_first_asset_root(), description)
    elif not asset_id and not description:
        raise ValueError('asset_id or description must be specified when exporting asset')
    return asset_id, description


def _first_asset_root():
    asset_roots = ee.data.getAssetRoots()
    if not asset_roots:
        raise Exception('User has no GEE asset roots: {}'.format(ee.Credentials()))
    return asset_roots[0]['id']


def _export_to_asset(to_task, asset_id, task_description, retries):
    return _export(
        to_observable=lambda: delete_asset(asset_id).pipe(
            flat_map(lambda _: execute_task(to_task()))
        ),
        description=task_description,
        retries=retries
    )


def _export_to_drive(to_task, task_description, retries):
    return _export(
        to_observable=lambda: execute_task(to_task()),
        description=task_description,
        retries=retries
    )


def _export(to_observable, description, retries):
    credentials = ee.Credentials()
    return concat(
        of('PENDING'),
        of(True).pipe(
            flat_map(
                lambda _: _ee_exports.enqueue(
                    observable=of(True).pipe(
                        do_action(lambda _: ee.InitializeThread(credentials)),
                        flat_map(to_observable())
                    ),
                    group=str(credentials),
                    description=description
                ),
            ),
            retry_with_backoff(retries=retries, description=description)
        ),
    )