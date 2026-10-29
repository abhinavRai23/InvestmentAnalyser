#import <AppKit/AppKit.h>

int main(int argc, char *argv[]) {
    if (argc < 3) {
        printf("Usage: seticon <image_path> <target_file_path>\n");
        return 1;
    }
    @autoreleasepool {
        NSString *imagePath = [NSString stringWithUTF8String:argv[1]];
        NSString *targetPath = [NSString stringWithUTF8String:argv[2]];
        NSImage *image = [[NSImage alloc] initWithContentsOfFile:imagePath];
        if (!image) {
            printf("Failed to load image at: %s\n", argv[1]);
            return 1;
        }
        BOOL success = [[NSWorkspace sharedWorkspace] setIcon:image forFile:targetPath options:0];
        printf("Icon set result: %d\n", success);
    }
    return 0;
}
