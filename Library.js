// For full API documentation, including code examples, visit https://wix.to/94BuAAs
import wixWindow from 'wix-window';
import wixData from 'wix-data';

$w.onReady(function () {
    //TODO: write your page related code here...
    $w('#repeater1').onItemReady(libraryItemReady);
    $w('#submit').onClick(async () => {
        $w('#search').disable();
        $w('#submit').disable();
        let value = $w('#search').value;
        let filter;
        if (value === undefined || value === '' || value === " ") {
            filter = wixData.filter();
        } else {
            const filterName = wixData.filter().contains("description", value)
            const filterDescription = wixData.filter().contains("name", value)
            filter = filterName.or(filterDescription)
        }
        await $w('#dataset1').setFilter(filter);
        $w('#search').enable();
        $w('#submit').enable();
    })
});

function libraryItemReady($item, itemdata, index) {
    $item('#speaker').text = itemdata.additionalInfoSections[0].description;
    let formats = itemdata.productOptions.Format.choices;
    let options = []
    for (var format of formats) {
        options.push({ "label": format.value, "value": format.value });
    }
    $item('#dropdown1').options = options;
    $item('#itemNo').text = itemdata.additionalInfoSections[1].description;
    $item('#borrow').onClick(() => {
        if ($item('#dropdown1').value === "") {
            $item('#dropdown1').updateValidityIndication()
        } else {
            wixWindow.openLightbox('Borrow', { 'book': itemdata.name, 'format': $item('#dropdown1').value });
        }
    })
}